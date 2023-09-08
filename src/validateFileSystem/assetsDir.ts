import { FileSystemError } from '../exceptions/errors';
import { VALID_LOCALES } from '../constants/locales';
import chalk from 'chalk';
import fs from 'fs-extra';
import getRelativePath from '../utils/getRelativePath';
import glob from 'glob';
import path from 'path';

/**
 * Validates that media assets directory is structured correctly:
 *   ...{assets dir}/{locale}/{embed-slug}/{*.jpg}
 * @param {string} ASSETS_DIR Directory of media assets
 */
export const validateAssetsDir = (ASSETS_DIR: string) => {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new FileSystemError(
      chalk`Media assets directory {yellow ${getRelativePath(
        ASSETS_DIR
      )}} does not exist. It needs to.`
    );
  }
  const embedLocalesDirs = glob.sync('*/', { cwd: ASSETS_DIR });
  for (const embedLocaleDir of embedLocalesDirs) {
    const locale = embedLocaleDir.replace('/', '');
    if (!VALID_LOCALES.includes(locale)) {
      throw new FileSystemError(
        chalk`Invalid directory in media assets: {cyan ${locale}}. All directories beneath {yellow ${getRelativePath(
          ASSETS_DIR
        )}} should be named with a valid locale code.`
      );
    }
    const LOCALE_DIR = path.join(ASSETS_DIR, locale);
    const embeds = glob.sync('*/', { cwd: LOCALE_DIR });
    for (const embed of embeds) {
      const EMBED_DIR = path.join(LOCALE_DIR, embed);
      const jpgs = glob.sync('*.jpg', { cwd: EMBED_DIR });
      if (jpgs.length < 1) {
        throw new FileSystemError(
          chalk`Did not find a {cyan .jpg} image in {yellow ${getRelativePath(
            EMBED_DIR
          )}}. One is required.`
        );
      }
    }
  }
};
