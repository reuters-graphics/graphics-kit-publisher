import sade from 'sade';
import { version } from '../package.json';
import { GraphicsKitPublisher } from '.';
import { handleError } from './exceptions/errors';

const prog = sade('graphics-publisher');

prog.version(version);

/**
 * Run a publisher command and exit the process cleanly once it resolves.
 *
 * The CLI never called `process.exit()` on success, so the process only exited
 * when the event loop drained. Dependencies (notably the AWS SDK S3 client) hold
 * keep-alive sockets open, which kept Node alive for ~1–2 minutes after the
 * command had otherwise finished. Exiting explicitly here — symmetric with the
 * `process.exit(1)` in `handleError` — makes the CLI return promptly regardless
 * of any leaked handles in dependencies.
 *
 * This lives in the CLI entrypoint (not the shared `withIntroOutro` decorator)
 * so it never affects consumers importing `GraphicsKitPublisher` as a library.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/137
 */
const runCommand = async (action: () => Promise<void>) => {
  try {
    await action();
    exitCleanly(0);
  } catch (error) {
    handleError(error);
  }
};

/**
 * Set the exit code and exit once stdout/stderr have flushed, so buffered output
 * (e.g. when piped through `npm-run-all`) isn't truncated by `process.exit()`.
 */
const exitCleanly = (code: number) => {
  process.exitCode = code;
  const streams = [process.stdout, process.stderr];
  let pending = 0;
  const done = () => {
    if (--pending <= 0) process.exit(code);
  };
  for (const stream of streams) {
    if (stream.writableLength > 0) {
      pending++;
      stream.once('drain', done);
    }
  }
  if (pending === 0) process.exit(code);
};

prog
  .command('preview')
  .action(() => runCommand(() => new GraphicsKitPublisher().preview()));

prog
  .command('upload')
  .action(() => runCommand(() => new GraphicsKitPublisher().upload()));

prog
  .command('upload:quick')
  .action(() =>
    runCommand(() => new GraphicsKitPublisher().uploadPublicOnly())
  );

prog
  .command('publish')
  .action(() => runCommand(() => new GraphicsKitPublisher().publish()));

prog
  .command('restart')
  .action(() => runCommand(() => new GraphicsKitPublisher().restart()));

prog
  .command('delete')
  .action(() => runCommand(() => new GraphicsKitPublisher().delete()));

prog.parse(process.argv);
