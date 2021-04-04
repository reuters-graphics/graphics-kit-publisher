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
import setDirectoryConfigMixin from './setDirectoryConfig';
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
      measureMixin
    );

    this.DEFAULT_METADATA_TITLE_PROP = defaultMetadataTitleProp;
    this.DEFAULT_METADATA_DESCRIPTION_PROP = defaultMetadataDescriptionProp;

    this.setDirectoryConfig({ dist, assets, pack, statics, images, locales, locale, defaultMetadataFile });
    this.validateFileSystem();
  }

  async upload(opts) {
    await this.measure(opts);
    await this.prepack();
    await this.pack();
  }
}

export default GraphicsPublisher;
