import { FileSystemError } from '../../exceptions/errors';
import { VALID_LOCALES } from '../../constants/locales';
import chalk from 'chalk';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

export default {
  /**
   * Validates that embeds/ directory is structured correctly:
   *   ...{dist dir}/embeds/{locale}/{embed-slug}/index.html
   * @param {string} DIST_DIR Directory of built files
   */
  validateDistDirEmbeds(DIST_DIR) {
    const EMBEDS_DIR = path.join(DIST_DIR, 'embeds');
    if (!fs.existsSync(EMBEDS_DIR)) return;
    const embedLocalesDirs = glob.sync('embeds/*/', { cwd: EMBEDS_DIR });
    for (const embedLocaleDir of embedLocalesDirs) {
      const locale = embedLocaleDir.replace('/', '');
      if (!VALID_LOCALES.includes(locale)) throw new FileSystemError(chalk`Invalid directory in embeds: {cyan ${locale}}. All directories beneath {yellow ${path.relative(process.cwd(), EMBEDS_DIR)}} should be named with a valid locale code.`);
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/', { cwd: LOCALE_DIR });
      for (const embed of embeds) {
        const EMBED_DIR = path.join(LOCALE_DIR, embed);
        const INDEX = path.join(EMBED_DIR, 'index.html');
        if (!fs.existsSync(INDEX)) throw new FileSystemError(chalk`Did not find an {cyan index.html} file in {yellow ${path.relative(process.cwd(), EMBED_DIR)}}. One is required.`);
      }
    }
  },

  validateDistDir(DIST_DIR) {
    const INDEX = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(INDEX)) throw new FileSystemError(chalk`Did not find an {cyan index.html} file in {yellow ${path.relative(process.cwd(), DIST_DIR)}}. One is required.`);
    this.validateDistDirEmbeds(DIST_DIR);
  },
};
