import type { ConfigType } from '../setConfig';
import createGraphicPack from './createGraphicPack';
import getPackMetadata from './getPackMetadata';
import updateGraphicPack from './updateGraphicPack';

export default async (config: ConfigType) => {
  const packMetadata = await getPackMetadata(config);
  if (!packMetadata.graphic.pack) {
    await createGraphicPack(packMetadata, config);
  } else {
    await updateGraphicPack(packMetadata, config);
  }
};
