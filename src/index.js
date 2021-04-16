import {
  DEFAULT_ASSETS_DIR,
  DEFAULT_DIST_DIR,
  DEFAULT_IMAGES_DIR,
  DEFAULT_LOCALES_DIR,
  DEFAULT_PACK_DIR
} from './constants/directories';
import {
  DEFAULT_PACK_DESCRIPTION_PROP,
  DEFAULT_PACK_LOCALE,
  DEFAULT_PACK_METADATA_FILE,
  DEFAULT_PACK_TITLE_PROP
} from './constants/pack';

import measureImagesMixin from './measureImages';
import metadataMixin from './metadata';
import packMixin from './pack';
import prepackMixin from './prepack';
import previewMixin from './preview';
import publishMixin from './publish';
import setDirectoryConfigMixin from './setDirectoryConfig';
import uploadMixin from './upload';
import validateFileSystemMixin from './validateFileSystem';

const defaultOptions = {
  distDir: DEFAULT_DIST_DIR,
  packDir: DEFAULT_PACK_DIR,
  assetsDir: DEFAULT_ASSETS_DIR,
  imagesDir: DEFAULT_IMAGES_DIR,
  localesDir: DEFAULT_LOCALES_DIR,
  packLocale: DEFAULT_PACK_LOCALE,
  packMetadataFile: DEFAULT_PACK_METADATA_FILE,
  packTitleProp: DEFAULT_PACK_TITLE_PROP,
  packDescriptionProp: DEFAULT_PACK_DESCRIPTION_PROP,
};

class GraphicsPublisher {
  constructor({
    distDir = DEFAULT_DIST_DIR,
    packDir = DEFAULT_PACK_DIR,
    assetsDir = DEFAULT_ASSETS_DIR,
    imagesDir = DEFAULT_IMAGES_DIR,
    localesDir = DEFAULT_LOCALES_DIR,
    packLocale = DEFAULT_PACK_LOCALE,
    packMetadataFile = DEFAULT_PACK_METADATA_FILE,
    packTitleProp = DEFAULT_PACK_TITLE_PROP,
    packDescriptionProp = DEFAULT_PACK_DESCRIPTION_PROP,
  } = defaultOptions) {
    Object.assign(
      this,
      setDirectoryConfigMixin,
      validateFileSystemMixin,
      metadataMixin,
      prepackMixin,
      packMixin,
      measureImagesMixin,
      uploadMixin,
      previewMixin,
      publishMixin
    );

    this.PACK_LOCALE = packLocale;
    this.PACK_TITLE_PROP = packTitleProp;
    this.PACK_DESCRIPTION_PROP = packDescriptionProp;

    this.setDirectoryConfig({ distDir, packDir, assetsDir, imagesDir, localesDir, packMetadataFile });
    this.validateSourceFiles();
  }
}

export default GraphicsPublisher;
