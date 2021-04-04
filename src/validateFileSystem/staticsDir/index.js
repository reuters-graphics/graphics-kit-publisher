import { FileSystemError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getPkgRoot from '../../utils/getPkgRoot';
import path from 'path';

export default {
  validateStaticImagesDir(STATIC_IMGS_DIR) {
    const CWD = getPkgRoot();
    if (!fs.existsSync(STATIC_IMGS_DIR)) throw new FileSystemError(chalk`Directory for images in static files not found: {yellow ${path.relative(CWD, STATIC_IMGS_DIR)}}`);
  },
  validateStaticsDir(STATICS_DIR) {
    const CWD = getPkgRoot();
    if (!fs.existsSync(STATICS_DIR)) throw new FileSystemError(chalk`Directory for static files not found: {yellow ${path.relative(CWD, STATICS_DIR)}}`);
  },
};
