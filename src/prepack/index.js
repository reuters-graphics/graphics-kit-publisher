import createGraphicPackMixin from './createGraphicPack';
import getPackMetadataMixin from './getPackMetadata';
import updateGraphicPackMixin from './updateGraphicPack';

export default {
  ...getPackMetadataMixin,
  ...createGraphicPackMixin,
  ...updateGraphicPackMixin,
  async prepack() {
    const packageMetadata = await this.getPackMetadata();
    if (!packageMetadata.graphic.pack) {
      await this.createGraphicPack(packageMetadata);
    } else {
      await this.updateGraphicPack(packageMetadata);
    }
  },
};
