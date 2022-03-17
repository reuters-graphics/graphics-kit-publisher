import {
  DEFAULT_WARN_IMAGE_SIZE
} from '../constants/images';
import chalk from 'chalk';
import mediaEditionsMixin from './mediaEditions';
import publicEditionMixin from './publicEdition';

const defaultOptions = {
  warnImageSize: DEFAULT_WARN_IMAGE_SIZE,
  fast: false,
};

export default {
  ...publicEditionMixin,
  ...mediaEditionsMixin,
  async upload(opts = defaultOptions) {
    const { fast: publishPublicOnly } = opts;
    await this.measureImages(opts);
    await this.prepack();
    await this.pack();
    await this.uploadPublicEdition();
    if (!publishPublicOnly) await this.uploadMediaEditions();
    console.log(chalk`\n\n🏁 {green Finished uploading pack.}\n`);
  },
};
