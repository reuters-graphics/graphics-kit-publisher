import { glob } from 'glob';
import { context } from '../context';
import { note } from '@reuters-graphics/clack';
import dedent from 'dedent';
import { FileNotFoundError, FileSystemError } from '../exceptions/errors';
import ignore from 'ignore';
import fs from 'fs';
import path from 'path';
import * as find from 'empathic/find';

const INVALID_FILE_TYPES = ['.zip'];

export const checkInvalidfiles = () => {
  const { cwd } = context;

  const ignoreFile = find.up('.gitignore', { cwd });

  if (!ignoreFile)
    throw new FileNotFoundError(
      'Error finding .gitignore in this project. One should be in the project root.'
    );

  const gitignoreFilter = ignore()
    .add(['.graphics-kit/', ...context.config.archiveEditions.ignore])
    .add(fs.readFileSync(ignoreFile, 'utf8'))
    .createFilter();

  const invalidFileFilter = (file: string) =>
    INVALID_FILE_TYPES.includes(path.extname(file).toLocaleLowerCase());

  const invalidFiles = glob
    .sync('**/*', {
      cwd,
      nodir: true,
      ignore: ['**/node_modules/**'],
    })
    .filter(gitignoreFilter)
    .filter(invalidFileFilter);

  if (invalidFiles.length > 0) {
    note(
      dedent`Please remove the following and try again:

      - ${invalidFiles.join('\n- ')}
    `,
      'Invalid files found'
    );

    throw new FileSystemError('Invalid files found');
  }
};
