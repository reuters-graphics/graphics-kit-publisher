import getPkgRoot from '../utils/getPkgRoot';
import path from 'path';

export default {
  setDirectoryConfig({
    dist: DIST_DIR,
    assets: ASSETS_DIR,
    pack: PACK_DIR,
    statics: STATICS_DIR,
    images: STATIC_IMGS_DIR,
    locales: LOCALES_DIR,
    locale,
    defaultMetadataFile,
  }) {
    this.CWD = getPkgRoot();
    this.DIST_DIR = path.join(this.CWD, DIST_DIR);
    this.ASSETS_DIR = path.join(this.CWD, ASSETS_DIR);
    this.PACK_DIR = path.join(this.CWD, PACK_DIR);
    this.STATICS_DIR = path.join(this.CWD, STATICS_DIR);
    this.STATIC_IMGS_DIR = path.join(this.STATICS_DIR, STATIC_IMGS_DIR);
    this.LOCALES_DIR = path.join(this.CWD, LOCALES_DIR);
    this.DEFAULT_LOCALE = locale;
    this.DEFAULT_METADATA_FILE = path.join(this.LOCALES_DIR, this.DEFAULT_LOCALE, defaultMetadataFile);
  },
};
