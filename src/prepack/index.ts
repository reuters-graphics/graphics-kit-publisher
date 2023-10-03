import type { ConfigType } from '../setConfig';
import createGraphicPack from './createGraphicPack';
import getPackMetadata from './getPackMetadata';
import updateGraphicPack from './updateGraphicPack';

export default async (config: ConfigType) => {
  const packMetadata = await getPackMetadata(config);
  if (!packMetadata.graphic.pack) {
    return createGraphicPack(packMetadata, config);
  } else {
    return updateGraphicPack(packMetadata, config);
  }
};
