import getPkgRoot from '../utils/getPkgRoot';
import path from 'path';

export default {
  setDirectoryConfig({ distDir, packDir, assetsDir, imagesDir, localesDir, packMetadataFile }) {
    this.CWD = getPkgRoot();
    this.DIST_DIR = path.join(this.CWD, distDir);
    this.PACK_DIR = path.join(this.CWD, packDir);
    this.ASSETS_DIR = path.join(this.CWD, assetsDir);
    this.IMAGES_DIR = path.join(this.CWD, imagesDir);
    this.LOCALES_DIR = path.join(this.CWD, localesDir);
    this.PACK_METADATA_FILE = path.join(this.LOCALES_DIR, this.PACK_LOCALE, packMetadataFile);
  },
};
