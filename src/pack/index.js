import archiveEditionsMixin from './archiveEditions';
import buildMixin from './build';
import makeAssetEditionsMixin from './makeAssetEditions';
import makeEmbedEditionsMixin from './makeEmbedEditions';
import makePreviewImagesMixin from './makePreviewImages';
import makePublicEditionMixin from './makePublicEdition';
import makeSrcArchiveMixin from './makeSrcArchive';
import resetPackDirMixin from './resetPackDir';

export default {
  ...makePublicEditionMixin,
  ...makeEmbedEditionsMixin,
  ...makeSrcArchiveMixin,
  ...archiveEditionsMixin,
  ...makeAssetEditionsMixin,
  ...makePreviewImagesMixin,
  ...resetPackDirMixin,
  ...buildMixin,
  /**
   * Creates graphic pack public and media edition archives
   */
  async pack() {
    this.getHomepage();
    this.resetPackDir();
    this.build();
    this.validateBuiltFiles();
    await this.makeSrcArchive();
    await this.makePublicEdition();
    this.makeEmbedEditions();
    await this.makePreviewImages();
    await this.makeAssetEditions();
    await this.archiveEditions();
  },
};
