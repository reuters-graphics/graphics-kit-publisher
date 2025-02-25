import { defaultOptions } from '../constants/options';
import getPkgRoot from '../utils/getPkgRoot';
import path from 'path';

/**
 * Set config
 */
const setConfig = ({
  distDir,
  packDir,
  assetsDir,
  imagesDir,
  localesDir,
  packMetadataFile,
  packLocale,
  packTitleProp,
  packDescriptionProp,
}: typeof defaultOptions) => {
  const PACK_LOCALE = packLocale;
  const PACK_TITLE_PROP = packTitleProp;
  const PACK_DESCRIPTION_PROP = packDescriptionProp;

  const CWD = getPkgRoot();
  const DIST_DIR = path.join(CWD, distDir);
  const PACK_DIR = path.join(CWD, packDir);
  const ASSETS_DIR = path.join(CWD, assetsDir);
  const IMAGES_DIR = path.join(CWD, imagesDir);
  const LOCALES_DIR = path.join(CWD, localesDir);
  const PACK_METADATA_FILE = path.join(
    LOCALES_DIR,
    PACK_LOCALE,
    packMetadataFile
  );

  return {
    PACK_LOCALE,
    PACK_TITLE_PROP,
    PACK_DESCRIPTION_PROP,
    DIST_DIR,
    PACK_DIR,
    ASSETS_DIR,
    IMAGES_DIR,
    LOCALES_DIR,
    PACK_METADATA_FILE,
  };
};

export default setConfig;

export type ConfigType = ReturnType<typeof setConfig>;
