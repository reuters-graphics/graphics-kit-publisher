import createGraphicPackMixin from './createGraphicPack';
import getPackMetadataMixin from './getPackMetadata';
import updateGraphicPackMixin from './updateGraphicPack';

export default {
  ...getPackMetadataMixin,
  ...createGraphicPackMixin,
  ...updateGraphicPackMixin,
  async prepack() {
    this.packageMetadata = await this.getPackMetadata();
    if (!this.packageMetadata.graphic.pack) {
      await this.createGraphicPack(this.packageMetadata);
    } else {
      await this.updateGraphicPack(this.packageMetadata);
    }
  },
};
