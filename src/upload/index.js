import chalk from 'chalk';
import mediaEditionsMixin from './mediaEditions';
import publicEditionMixin from './publicEdition';

export default {
  ...publicEditionMixin,
  ...mediaEditionsMixin,
  async upload(opts) {
    const { fast: publishPublicOnly } = opts;
    await this.measureImages(opts);
    await this.prepack();
    await this.pack();
    await this.uploadPublicEdition();
    if (!publishPublicOnly) await this.uploadMediaEditions();
    console.log(chalk`\n\n🏁 {green Finished uploading pack.}\n`);
  },
};
