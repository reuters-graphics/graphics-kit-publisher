import type { ConfigType } from '../setConfig';
import { validateAssetsDir } from './assetsDir';
import { validateDistDir } from './distDir';
import { validateImagesDir } from './imagesDir';
import { validateLocalesDir } from './localesDir';
import { validatePackDir } from './packDir';

export const validateSourceFiles = (directoryConfig: ConfigType) => {
  const {
    PACK_DIR,
    ASSETS_DIR,
    IMAGES_DIR,
    LOCALES_DIR,
    PACK_LOCALE,
    PACK_METADATA_FILE,
  } = directoryConfig;
  validatePackDir(PACK_DIR);
  validateAssetsDir(ASSETS_DIR);
  validateImagesDir(IMAGES_DIR);
  validateLocalesDir(LOCALES_DIR, PACK_LOCALE, PACK_METADATA_FILE);
};
export const validateBuiltFiles = (directoryConfig: ConfigType) => {
  const { DIST_DIR } = directoryConfig;
  validateDistDir(DIST_DIR);
};
