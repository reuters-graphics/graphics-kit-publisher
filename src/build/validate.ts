import { FileSystemError, InvalidFileTypeError } from '../exceptions/errors';

import { VALID_FILE_TYPES } from '../constants/fileTypes';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import { context } from '../context';
import { note } from '../clack';
import dedent from 'dedent';
import type { spinner } from '@clack/prompts';
import { logs } from '../logging';
import picocolors from 'picocolors';

/**
 * Errors if file types in outDir will be rejected by RNGS
 */
const validateOutDirFileTypes = (s: ReturnType<typeof spinner>) => {
  const { outDir } = context.config.build;
  const distDir = path.join(context.cwd, outDir);
  const files = glob.sync('**/*', { cwd: distDir, nodir: true });
  const warnFiles = [];
  for (const file of files) {
    const fileType = path.extname(file).toLowerCase();
    if (VALID_FILE_TYPES.indexOf(fileType) < 0) warnFiles.push(file);
  }
  if (warnFiles.length > 0) {
    s.stop('Build failed');
    note(
      dedent`Found invalid file types that the graphics server will reject.
      
      Check your static files for the following and remove them: 
      
      - ${warnFiles.map((f) => picocolors.cyan(f)).join('\n- ')}
      `,
      'Invalid file types'
    );
    throw new InvalidFileTypeError(
      `Found invalid file types in this project's built files.`
    );
  }
};

/**
 * Errors if index.html is not in outDir
 */
const validateOutDirIndex = (s: ReturnType<typeof spinner>) => {
  const { outDir } = context.config.build;
  const distDir = path.join(context.cwd, outDir);
  const INDEX = path.join(distDir, 'index.html');
  if (!fs.existsSync(INDEX)) {
    s.stop('Build failed');
    note(
      dedent`Your project failed to build. This usually means there's an error somewhere in your app's code.
      
      See the logs in ${picocolors.cyan(logs.logDirName)} for details from the build process.
      `,
      'Build error'
    );
    throw new FileSystemError(
      `Build did not create a root index.html file in ${outDir}.`
    );
  }
};

/**
 * Validate build process created build files compatible with the graphics server
 * @param s Spinner
 */
export const validateOutDir = (s: ReturnType<typeof spinner>) => {
  validateOutDirIndex(s);
  validateOutDirFileTypes(s);
};
