import path from 'path';

/**
 * Gets path relative to current working directory.
 */
export default (absolutePath: string) =>
  path.relative(process.cwd(), absolutePath);
