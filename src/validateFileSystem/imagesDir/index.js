import { FileSystemError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export default {
  validateImagesDir(IMAGES_DIR) {
    if (!fs.existsSync(IMAGES_DIR)) throw new FileSystemError(chalk`Directory for images not found: {yellow ${path.relative(this.CWD, IMAGES_DIR)}}`);
  },
};
