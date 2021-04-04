import {
  DEFAULT_ASSETS_DIR,
  DEFAULT_DIST_DIR,
  DEFAULT_IMAGES_DIR,
  DEFAULT_LOCALE,
  DEFAULT_LOCALES_DIR,
  DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP,
  DEFAULT_LOCALE_METADATA_FILE,
  DEFAULT_LOCALE_METADATA_TITLE_PROP,
  DEFAULT_PACK_DIR,
  DEFAULT_STATICS_DIR
} from './constants/directories';

import measureMixin from './measure';
import metadataMixin from './metadata';
import packMixin from './pack';
import prepackMixin from './prepack';
import publishMixin from './publish';
import setDirectoryConfigMixin from './setDirectoryConfig';
import uploadMixin from './upload';
import validateFileSystemMixin from './validateFileSystem';

class GraphicsPublisher {
  constructor({
    dist = DEFAULT_DIST_DIR,
    assets = DEFAULT_ASSETS_DIR,
    pack = DEFAULT_PACK_DIR,
    statics = DEFAULT_STATICS_DIR,
    images = DEFAULT_IMAGES_DIR,
    locales = DEFAULT_LOCALES_DIR,
    locale = DEFAULT_LOCALE,
    defaultMetadataFile = DEFAULT_LOCALE_METADATA_FILE,
    defaultMetadataTitleProp = DEFAULT_LOCALE_METADATA_TITLE_PROP,
    defaultMetadataDescriptionProp = DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP,
  }) {
    Object.assign(
      this,
      setDirectoryConfigMixin,
      validateFileSystemMixin,
      metadataMixin,
      prepackMixin,
      packMixin,
      measureMixin,
      uploadMixin,
      publishMixin
    );

    this.DEFAULT_METADATA_TITLE_PROP = defaultMetadataTitleProp;
    this.DEFAULT_METADATA_DESCRIPTION_PROP = defaultMetadataDescriptionProp;

    this.setDirectoryConfig({ dist, assets, pack, statics, images, locales, locale, defaultMetadataFile });
    this.validateFileSystem();
  }
}

export default GraphicsPublisher;
