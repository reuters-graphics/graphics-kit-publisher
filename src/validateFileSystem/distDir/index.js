import { FileSystemError, InvalidFileTypeError } from '../../exceptions/errors';

import { VALID_FILE_TYPES } from '../../constants/fileTypes';
import { VALID_LOCALES } from '../../constants/locales';
import chalk from 'chalk';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import slugify from 'slugify';

export default {
  /**
   * Validates that embeds/ directory is structured correctly:
   *   ...{dist dir}/embeds/{locale}/{embed-slug}/index.html
   * @param {string} DIST_DIR Directory of built files
   */
  validateDistDirEmbeds(DIST_DIR) {
    const EMBEDS_DIR = path.join(DIST_DIR, 'embeds');
    if (!fs.existsSync(EMBEDS_DIR)) return;
    const embedLocalesDirs = glob.sync('*/', { cwd: EMBEDS_DIR });
    for (const embedLocaleDir of embedLocalesDirs) {
      const locale = embedLocaleDir.replace('/', '');
      if (!VALID_LOCALES.includes(locale)) throw new FileSystemError(chalk`Invalid directory in embeds: {cyan ${locale}}. All directories beneath {yellow ${path.relative(this.CWD, EMBEDS_DIR)}} should be named with a valid locale code.`);
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/', { cwd: LOCALE_DIR });
      for (const embed of embeds) {
        const embedDirName = embed.replace('/', '');
        // Embeds should be lowercased, non-underscored, strict slugs.
        const validEmbedDirName = slugify(embedDirName.replace(/_/g, '-'), { lower: true, strict: true });
        if (embedDirName !== validEmbedDirName) {
          throw new FileSystemError(chalk`Embed pages should be slugified. Maybe rename {cyan embeds/${locale}/${embedDirName}} to {green embeds/${locale}/${validEmbedDirName}}?`);
        }
        const EMBED_DIR = path.join(LOCALE_DIR, embed);
        const INDEX = path.join(EMBED_DIR, 'index.html');
        if (!fs.existsSync(INDEX)) throw new FileSystemError(chalk`Did not find an {cyan index.html} file in {yellow ${path.relative(this.CWD, EMBED_DIR)}}. One is required. This may mean you had an error when building the project and should check for an earlier error message to determine what went wrong.`);
      }
    }
  },

  /**
   * Error if file types in DIST_DIR will be rejected by RNGS
   * @param {string} DIST_DIR Directory of built files
   */
  validateDistDirFileTypes(DIST_DIR) {
    const files = glob.sync('**/*', { cwd: DIST_DIR, nodir: true });
    const warnFiles = [];
    for (const file of files) {
      const fileType = path.extname(file).toLowerCase();
      if (VALID_FILE_TYPES.indexOf(fileType) < 0) warnFiles.push(file);
    }
    if (warnFiles.length > 0) {
      throw new InvalidFileTypeError(chalk`Found invalid file types in this project's built files. Check your static files for the following: {yellow ${warnFiles.join(', ')}}`);
    }
  },

  validateDistDir(DIST_DIR) {
    const INDEX = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(INDEX)) throw new FileSystemError(chalk`Did not find an {cyan index.html} file in {yellow ${path.relative(this.CWD, DIST_DIR)}}. One is required. This may mean you had an error when building the project and should check for an earlier error message to determine what went wrong.`);
    this.validateDistDirEmbeds(DIST_DIR);
    this.validateDistDirFileTypes(DIST_DIR);
  },
};
