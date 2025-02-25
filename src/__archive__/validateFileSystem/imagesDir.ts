import { FileSystemError } from '../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getRelativePath from '../utils/getRelativePath';

/**
 * Validates that images directory exists
 * @param {string} IMAGES_DIR Directory of image files
 */
export const validateImagesDir = (IMAGES_DIR: string) => {
  if (!fs.existsSync(IMAGES_DIR)) {
    throw new FileSystemError(
      chalk`Directory for images not found: {yellow ${getRelativePath(
        IMAGES_DIR
      )}}`
    );
  }
};
