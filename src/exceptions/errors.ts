/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk';

export class LocationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class FileSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidFileTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PackageMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PackageConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UserConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EditionArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const coalesceToError = (err: unknown) => {
  return (
      err instanceof Error || (err && (err as any).name && (err as any).message)
    ) ?
      (err as Error)
    : new Error(JSON.stringify(err));
};

/**
 * Log errors and exit the current process
 * @param error
 */
export const handleError = (e: unknown) => {
  const error = coalesceToError(e);
  const prefix = chalk.bold.red('> Publisher ERROR:');
  if (error.message) {
    console.error(`${prefix} ${error.message}\n`);
    if (error.stack) {
      console.error(chalk.gray(error.stack.split('\n').slice(1).join('\n')));
    }
  } else {
    console.error(`${prefix} ${error}`);
  }
  process.exit(1);
};
