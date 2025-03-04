import { BuildError, PackageConfigError } from '../exceptions/errors';
import { spawnSync } from 'child_process';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import path from 'path';
import { spinner } from '@clack/prompts';
import { cleanOutDir, deleteZeroLengthFiles } from './clean';
import { validateOutDir } from './validate';
import { logs } from '../logging';
import { note } from '@reuters-graphics/clack';
import dedent from 'dedent';
import picocolors from 'picocolors';

const findBuildErrorFromLogs = (err: string) => {
  const errorKeywords =
    /(error|exception|failed|not found|fatal|denied|unexpected)/i;
  const errorLines = err.split('\n').filter((line) => errorKeywords.test(line));
  return errorLines.slice(0, 2);
};

/**
 * Call a project's build script and validates the build process completed successfully
 * @param buildScript the build script defined in package.json
 */
const buildApp = (buildScript: string) => {
  const pkg = utils.getPkg();
  const { cwd, pkgMgr } = context;
  const outDir = path.join(cwd, context.config.build.outDir);

  cleanOutDir(outDir);

  if (!pkg.scripts[buildScript]) {
    throw new PackageConfigError(
      `package.json has no "${buildScript}" script. Check your package scripts or adjust your publisher config.`
    );
  }

  const s = spinner();

  s.start('Building your project');

  const buildProcess = spawnSync(pkgMgr?.agent || 'npm', ['run', buildScript], {
    stdio: ['inherit', 'pipe', 'pipe'],
    cwd: context.cwd,
  });

  const err = buildProcess.stderr?.toString() || '';
  const out = buildProcess.stdout?.toString() || '';
  logs.writeErrLog(err.trim());
  logs.writeOutLog(out.trim());

  if (buildProcess.status !== 0) {
    s.stop('Build failed');

    const errors = findBuildErrorFromLogs(err);
    const errorsLog =
      errors.length ?
        `\nPossible errors found:\n${errors.map((e) => `- ${picocolors.red(e.slice(0, 30))}\n`)}\n`
      : '';

    note(
      dedent`Your project failed to build. This usually means there's an error somewhere in your app's code.
      ${errorsLog}
      See the build logs in ${picocolors.cyan(logs.logDirName)} for details from the build process.
      `,
      'Build error'
    );
    throw new BuildError('App failed to build');
  }
  deleteZeroLengthFiles(outDir);

  /**
   * Validates outDir and throws an error if:
   * 1. There are files with invalid file types in the outDir after build
   */
  validateOutDir(s);

  s.stop('Build succeeded');
};

/**
 * Runs project's preview build script
 */
export const buildForPreview = () => {
  const buildScript = context.config.build.scripts.preview;
  buildApp(buildScript);
};

/**
 * Runs project's production build script
 */
export const buildForProduction = () => {
  const buildScript = context.config.build.scripts.production;
  buildApp(buildScript);
};
