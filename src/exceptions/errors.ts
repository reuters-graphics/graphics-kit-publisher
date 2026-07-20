/* eslint-disable @typescript-eslint/no-explicit-any */
import picocolors from 'picocolors';
import fs from 'fs';
import { extractLikelyErrors } from '../diagnostics/likelyError';

/**
 * Structured context attached to a {@link PublisherError}.
 *
 * These fields let both a human reading the terminal and an AI diagnosing the
 * failure start from targeted information rather than a stack trace that points
 * into bundled `dist`.
 */
export interface PublisherErrorOptions {
  /** Stable machine code, e.g. `'BUILD_FAILED'`. Defaults to the class name. */
  code?: string;
  /**
   * For delegated/subprocess errors, the log files where the *real* error lives
   * (e.g. the build subprocess's captured stderr), which the thrower's own
   * stack does not describe.
   */
  logPaths?: string[];
  /** One-sentence, human-readable remediation. */
  hint?: string;
  /** The offending value / allowed-list / HTTP status etc., captured before it goes out of scope. */
  context?: Record<string, unknown>;
  /** The underlying error, preserved for debugging. */
  cause?: unknown;
}

/**
 * Base class for all publisher errors. Carries machine-readable context
 * ({@link PublisherErrorOptions}) so failures are self-describing.
 *
 * `command` is stamped at the CLI boundary (see `runCommand` in `src/cli.ts`),
 * not at the throw site, so throw sites stay ignorant of CLI context.
 */
export class PublisherError extends Error {
  code: string;
  command?: string;
  logPaths?: string[];
  hint?: string;
  context?: Record<string, unknown>;

  constructor(message: string, options: PublisherErrorOptions = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined
    );
    this.name = this.constructor.name;
    this.code = options.code ?? this.constructor.name;
    if (options.logPaths) this.logPaths = options.logPaths;
    if (options.hint) this.hint = options.hint;
    if (options.context) this.context = options.context;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class HTTPError extends PublisherError {}

export class ServerError extends PublisherError {}

export class ConfigError extends PublisherError {}

export class LocationError extends PublisherError {}

export class BuildError extends PublisherError {}

export class FileNotFoundError extends PublisherError {}

export class FileSystemError extends PublisherError {}

export class InvalidLocaleError extends PublisherError {}

export class InvalidFileTypeError extends PublisherError {}

export class PackageMetadataError extends PublisherError {}

export class PageMetadataError extends PublisherError {}

export class PackageConfigError extends PublisherError {}

export class UserConfigError extends PublisherError {}

export class EditionArchiveError extends PublisherError {}

export class ServerCredentialsError extends PublisherError {}

const coalesceToError = (err: unknown) => {
  return (
      err instanceof Error || (err && (err as any).name && (err as any).message)
    ) ?
      (err as Error)
    : new Error(JSON.stringify(err));
};

/** Show the full stack only when the user opts in — it points into bundled `dist`. */
const isVerbose = () =>
  process.argv.includes('--verbose') || !!process.env.DEBUG;

const readLikelyCause = (logPaths: string[]): string[] => {
  const combined = logPaths
    .map((logPath) => {
      try {
        return fs.readFileSync(logPath, 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  return extractLikelyErrors(combined, { cwd: process.cwd() });
};

export interface HandleErrorOptions {
  /** The CLI command that was running, for display. */
  command?: string;
  /** Path to the diagnostics file written for this failure, if any. */
  diagnosticsPath?: string | null;
}

/**
 * Render an error to the terminal — WITHOUT exiting.
 *
 * For a {@link PublisherError} this surfaces the code, a heuristic "likely cause"
 * (for delegated errors, extracted from the captured logs), the remediation
 * hint, and pointers to the logs + diagnostics file. The raw stack is hidden
 * unless `--verbose` / `DEBUG` is set.
 *
 * Split from {@link handleError} so an interactive step (e.g. the Claude Code
 * handoff) can run after the error is shown but before the process exits.
 */
export const renderError = (e: unknown, options: HandleErrorOptions = {}) => {
  const error = coalesceToError(e);
  const isPublisherError = error instanceof PublisherError;

  const code = isPublisherError ? ` ${picocolors.dim(`[${error.code}]`)}` : '';
  const prefix = picocolors.red(picocolors.bold('> Publisher ERROR:'));
  console.error(`${prefix}${code} ${error.message || String(error)}`);

  // Likely cause — for delegated errors, extracted from the captured logs.
  if (isPublisherError && error.logPaths?.length) {
    const likely = readLikelyCause(error.logPaths);
    if (likely.length) {
      console.error(`\n${picocolors.bold('Likely cause:')}`);
      for (const line of likely) console.error(picocolors.red(line));
    }
  }

  // Remediation hint.
  if (isPublisherError && error.hint) {
    console.error(`\n${picocolors.bold('Fix:')} ${error.hint}`);
  }

  // Pointers to logs + the prompt-ready diagnostics file.
  const pointers: string[] = [];
  if (isPublisherError && error.logPaths?.length) {
    pointers.push(`Logs: ${error.logPaths.join(', ')}`);
  }
  if (options.diagnosticsPath) {
    pointers.push(`Diagnostics: ${options.diagnosticsPath}`);
  }
  if (pointers.length) {
    console.error('');
    for (const pointer of pointers) console.error(picocolors.dim(pointer));
  }

  // Full stack only on opt-in.
  if (isVerbose() && error.stack) {
    console.error(
      `\n${picocolors.gray(error.stack.split('\n').slice(1).join('\n'))}`
    );
  }
};

/**
 * Render an error and exit the process with code 1.
 */
export const handleError = (e: unknown, options: HandleErrorOptions = {}) => {
  renderError(e, options);
  process.exit(1);
};
