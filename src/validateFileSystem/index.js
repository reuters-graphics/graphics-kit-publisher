import validateAssetsDirMixin from './assetsDir';
import validateDistDirMixin from './distDir';
import validateImagesDirMixin from './imagesDir';
import validateLocalesDirMixin from './localesDir';
import validatePackDirMixin from './packDir';

export default {
  ...validateDistDirMixin,
  ...validatePackDirMixin,
  ...validateAssetsDirMixin,
  ...validateImagesDirMixin,
  ...validateLocalesDirMixin,
  validateSourceFiles() {
    this.validatePackDir(this.PACK_DIR);
    this.validateAssetsDir(this.ASSETS_DIR);
    this.validateImagesDir(this.IMAGES_DIR);
    this.validateLocalesDir(this.LOCALES_DIR, this.PACK_LOCALE);
  },
  async validateBuiltFiles(forRNGS = false) {
    await this.validateDistDir(this.DIST_DIR, forRNGS);
  },
};
