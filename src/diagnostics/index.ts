import path from 'path';
import fs from 'fs';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import { logs, ensureGraphicsKitIgnored } from '../logging';
import { PublisherError } from '../exceptions/errors';
import { extractLikelyErrors } from './likelyError';
import { redactSecrets } from './redact';
import { version } from '../../package.json';

const DIAGNOSTICS_DIR = '.graphics-kit/diagnostics/';
const LLMS_DIR =
  './node_modules/@reuters-graphics/graphics-kit-publisher/llms/';
/** Cap each embedded log tail so the file stays a usable prompt. */
const MAX_LOG_TAIL_BYTES = 8_000;

/** Read the last `maxBytes` of a file, or null if it doesn't exist / can't be read. */
const readTail = (
  absPath: string,
  maxBytes: number = MAX_LOG_TAIL_BYTES
): string | null => {
  try {
    if (!fs.existsSync(absPath)) return null;
    const contents = fs.readFileSync(absPath, 'utf8');
    return contents.length > maxBytes ?
        contents.slice(contents.length - maxBytes)
      : contents;
  } catch {
    return null;
  }
};

const codeBlock = (body: string, lang = ''): string[] => [
  '```' + lang,
  body,
  '```',
  '',
];

/**
 * Build the diagnostics markdown. Written in the second person as a ready-to-use
 * prompt: point an agent at the error, the logs, and the publisher's rule docs.
 */
const buildContent = (error: unknown, command?: string): string => {
  const err = error instanceof Error ? error : new Error(String(error));
  const isPublisherError = err instanceof PublisherError;
  const cmd = command ?? (isPublisherError ? err.command : undefined);

  const errLog = readTail(logs.errLogPath);
  const outLog = readTail(logs.outLogPath);

  // Prefer the error's own logPaths (delegated errors); otherwise fall back to error.log.
  let likely: string[] = [];
  const logPaths = isPublisherError && err.logPaths ? err.logPaths : [];
  for (const logPath of logPaths) {
    const tail = readTail(logPath);
    if (tail) {
      likely = extractLikelyErrors(tail, { cwd: context.cwd });
      if (likely.length) break;
    }
  }
  if (!likely.length && errLog) {
    likely = extractLikelyErrors(errLog, { cwd: context.cwd });
  }

  const lines: string[] = [];
  lines.push('# Publisher diagnostics');
  lines.push('');
  lines.push(
    `You are helping debug a failure of the Reuters Graphics publisher CLI, which ran inside this project (\`${context.cwd}\`). Read the error, the logs, and the publisher's rule docs below, then find the real root cause, cite the offending file or rule, and propose a concrete fix. Ask before editing files.`
  );
  lines.push('');

  lines.push('## Environment');
  lines.push(`- Publisher version: ${version}`);
  lines.push(`- Command: ${cmd ?? 'unknown'}`);
  lines.push(`- Node: ${process.version}`);
  lines.push(`- Platform: ${process.platform}`);
  lines.push(
    `- Package manager: ${context.pkgMgr?.agent ?? context.pkgMgr?.name ?? 'unknown'}`
  );
  lines.push(`- CI: ${utils.environment.isCiEnvironment()}`);
  lines.push('');

  lines.push('## Error');
  lines.push(`- Type: ${err.name}`);
  if (isPublisherError) lines.push(`- Code: ${err.code}`);
  lines.push(`- Message: ${err.message}`);
  if (isPublisherError && err.hint) lines.push(`- Hint: ${err.hint}`);
  lines.push('');
  if (isPublisherError && err.context) {
    lines.push('### Context');
    lines.push(...codeBlock(JSON.stringify(err.context, null, 2), 'json'));
  }

  if (likely.length) {
    lines.push('## Likely cause');
    lines.push(...codeBlock(likely.join('\n')));
  }

  if (errLog) {
    lines.push('## Log: error.log (tail)');
    lines.push(...codeBlock(errLog.trim()));
  }
  if (outLog) {
    lines.push('## Log: out.log (tail)');
    lines.push(...codeBlock(outLog.trim()));
  }

  lines.push('## Publisher rules & docs');
  lines.push(
    `The publisher's rule docs live in \`${LLMS_DIR}\`. Read the relevant ones to understand the rule that produced this error.`
  );
  lines.push('');

  lines.push('## Project');
  lines.push('- Publisher config: `publisher.config.ts`');
  lines.push('- Graphic metadata: the `reuters` key in `package.json`');
  lines.push(`- Build output dir: \`${context.config.build.outDir}\``);
  lines.push('');

  lines.push('## Task');
  lines.push('1. Identify the root cause.');
  lines.push('2. Cite the offending file/line or the publisher rule.');
  lines.push('3. Propose a concrete fix. Ask before editing.');

  return lines.join('\n');
};

/**
 * Write a prompt-ready diagnostics markdown file for a failed command. Secrets
 * are redacted, and `.graphics-kit/` is ensured git-ignored first so the file is
 * never committed.
 *
 * Best-effort: returns the absolute path to `latest.md`, or `null` if writing
 * failed (a diagnostics failure must never mask the real error).
 */
export const writeDiagnostics = (
  error: unknown,
  command?: string
): string | null => {
  try {
    const { cwd } = context;
    ensureGraphicsKitIgnored();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const content = redactSecrets(buildContent(error, command));
    const absTimestamped = path.join(cwd, DIAGNOSTICS_DIR, `${timestamp}.md`);
    const absLatest = path.join(cwd, DIAGNOSTICS_DIR, 'latest.md');

    utils.fs.ensureWriteFile(absTimestamped, content);
    utils.fs.ensureWriteFile(absLatest, content);

    return absLatest;
  } catch {
    return null;
  }
};
