import type { ConfigType } from '../setConfig';
import { DEFAULT_WARN_IMAGE_SIZE } from '../constants/images';
import { MeasureImages } from '../measureImages';
import chalk from 'chalk';
import pack from '../pack';
import prepack from '../prepack';
import uploadMediaEditions from './mediaEditions';
import uploadPublicEdition from './publicEdition';

const defaultOptions = {
  warnImageSize: DEFAULT_WARN_IMAGE_SIZE,
  fast: false,
};

export default async (config: ConfigType, opts = defaultOptions) => {
  const { fast: publishPublicOnly } = opts;
  const measureImages = new MeasureImages(config.IMAGES_DIR);
  await measureImages.measureImages(opts);
  const serverClient = await prepack(config);
  await pack(config);
  await uploadPublicEdition(config, serverClient);
  if (!publishPublicOnly) await uploadMediaEditions(config, serverClient);
  console.log(chalk`\n\n🏁 {green Finished uploading pack.}\n`);
};
