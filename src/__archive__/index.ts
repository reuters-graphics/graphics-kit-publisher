import { defaultOptions, defaultUploadOptions } from './constants/options';
import getPackMetadata, { setUpdatedTime } from './prepack/getPackMetadata';
import { validateBuiltFiles, validateSourceFiles } from './validateFileSystem';

import type { ConfigType } from './setConfig';
import { MeasureImages } from './measureImages';
import archiveEditions from './pack/archiveEditions';
import { getHomepage } from './metadata';
import makeAssetEditions from './pack/makeAssetEditions';
import makeEmbedEditions from './pack/makeEmbedEditions';
import makePreviewImages from './pack/makePreviewImages';
import makePublicEdition from './pack/makePublicEdition';
import makeSrcArchive from './pack/makeSrcArchive';
import pack from './pack';
import prepack from './prepack';
import preview from './preview';
import publish from './publish';
import setConfig from './setConfig';
import upload from './upload';

export class GraphicsPublisher {
  /**
   * Absolute paths to publisher directories and additional configuration options.
   * @hidden
   */
  config: ConfigType;

  constructor(options = defaultOptions) {
    const {
      distDir,
      packDir,
      assetsDir,
      imagesDir,
      localesDir,
      packMetadataFile,
      packLocale,
      packTitleProp,
      packDescriptionProp,
    } = { ...defaultOptions, ...options }; // Overload defaults with passed options.
    this.config = setConfig({
      distDir,
      packDir,
      assetsDir,
      imagesDir,
      localesDir,
      packMetadataFile,
      packLocale,
      packTitleProp,
      packDescriptionProp,
    });
    validateSourceFiles(this.config);
  }

  /**
   * Upload a preview of your project to S3.
   */
  async preview() {
    await preview(this.config);
  }

  /**
   * Upload your project to the RNGS server.
   * @param opts Upload options
   */
  async upload(opts = defaultUploadOptions) {
    await upload(this.config, opts);
  }

  /**
   * Publish your project in the RNGS server. (Must upload project first!)
   */
  async publish() {
    await publish(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async prepack() {
    await prepack(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async pack() {
    await pack(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async makeSrcArchive(testing = false) {
    await makeSrcArchive(this.config, testing);
  }

  /**
   * @hidden For testing only...
   */
  async measureImages() {
    const measureImages = new MeasureImages(this.config.IMAGES_DIR);
    await measureImages.measureImages();
  }

  /**
   * @hidden For testing only...
   */
  getHomepage() {
    return getHomepage();
  }

  /**
   * @hidden For testing only...
   */
  async makePublicEdition() {
    await makePublicEdition(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async makeEmbedEditions() {
    await makeEmbedEditions(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async makePreviewImages() {
    await makePreviewImages(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async makeAssetEditions() {
    await makeAssetEditions(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async archiveEditions() {
    await archiveEditions(this.config);
  }

  /**
   * @hidden For testing only...
   */
  async setUpdatedTime() {
    await setUpdatedTime();
  }

  /**
   * @hidden For testing only...
   */
  async getPackMetadata() {
    await getPackMetadata(this.config);
  }

  /**
   * @hidden For testing only...
   */
  validateBuiltFiles() {
    validateBuiltFiles(this.config);
  }

  /**
   * @hidden For testing only...
   */
  validateSourceFiles() {
    validateSourceFiles(this.config);
  }
}
