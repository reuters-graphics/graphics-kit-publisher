import validateAssetsDirMixin from './assetsDir';
import validateDistDirMixin from './distDir';
import validateLocalesDirMixin from './localesDir';
import validatePackDirMixin from './packDir';
import validateStaticsDirMixin from './staticsDir';

export default {
  ...validateAssetsDirMixin,
  ...validateDistDirMixin,
  ...validatePackDirMixin,
  ...validateStaticsDirMixin,
  ...validateLocalesDirMixin,
  validateFileSystem() {
    this.validateDistDir(this.DIST_DIR);
    this.validateAssetsDir(this.ASSETS_DIR);
    this.validatePackDir(this.PACK_DIR);
    this.validateStaticsDir(this.STATICS_DIR);
    this.validateStaticImagesDir(this.STATIC_IMGS_DIR);
    this.validateLocalesDir(this.LOCALES_DIR, this.DEFAULT_LOCALE);
  },
};
