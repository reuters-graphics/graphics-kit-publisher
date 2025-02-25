import { FileSystemError } from '../exceptions/errors';
import { VALID_LOCALES } from '../constants/locales';
import chalk from 'chalk';
import fs from 'fs-extra';
import getRelativePath from '../utils/getRelativePath';
import glob from 'glob';
import path from 'path';

/**
 * Validates that locales directory is structured correctly:
 *   ...{locales dir}/{locale}/{**.json}
 * @param LOCALES_DIR Directory of locale files
 * @param DEFAULT_LOCALE Default locale
 * @param PACK_METADATA_FILE Pack metadata file
 */
export const validateLocalesDir = (
  LOCALES_DIR: string,
  DEFAULT_LOCALE: string,
  PACK_METADATA_FILE: string
) => {
  if (!fs.existsSync(LOCALES_DIR)) {
    throw new FileSystemError(
      chalk`Locales directory {yellow ${getRelativePath(
        LOCALES_DIR
      )}} does not exist. It needs to.`
    );
  }
  const localesDirs = glob.sync('*/', { cwd: LOCALES_DIR });
  for (const localeDir of localesDirs) {
    const locale = localeDir.replace('/', '');
    if (!VALID_LOCALES.includes(locale)) {
      throw new FileSystemError(
        chalk`Invalid directory in locales: {cyan ${locale}}. All directories beneath {yellow ${getRelativePath(
          LOCALES_DIR
        )}} should be named with a valid locale code.`
      );
    }
  }
  if (!fs.existsSync(path.join(LOCALES_DIR, DEFAULT_LOCALE))) {
    throw new FileSystemError(
      chalk`Locale directory for default locale {cyan ${DEFAULT_LOCALE}} does not exist in {yellow ${getRelativePath(
        LOCALES_DIR
      )}}. It needs to.`
    );
  }
  if (!fs.existsSync(PACK_METADATA_FILE)) {
    throw new FileSystemError(
      chalk`Default metadata JSON file {cyan ${path.basename(
        PACK_METADATA_FILE
      )}} does not exist in default locale directory {yellow ${getRelativePath(
        path.dirname(PACK_METADATA_FILE)
      )}}. It needs to.`
    );
  }
};
