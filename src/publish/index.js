import chalk from 'chalk';
import getPkg from '../utils/getPkg';
import prompts from 'prompts';

export default {
  async publish() {
    const pkg = getPkg();
    const { pack } = pkg.reuters.graphic;
    if (!pack) {
      console.log('Can\'t publish this graphic until you upload it first.');
      return;
    }

    if (process.env.GRAPHICS_SERVER_PUBLISH) {
      const MEDIA = process.env.GRAPHICS_SERVER_PUBLISH_TO_MEDIA ? ['media-interactive'] : false;
      const LYNX = process.env.GRAPHICS_SERVER_PUBLISH_TO_LYNX ? ['interactive'] : false;

      this.packageMetadata = await this.getPackMetadata();
      await this.updateGraphicPack(this.packageMetadata);

      await this.SERVER_CLIENT.publishGraphic([], MEDIA, LYNX, false);
    } else {
      const questions = [{
        type: 'confirm',
        name: 'isCorrection',
        message: 'Are you publishing a correction?',
        initial: false,
      }, {
        type: 'confirm',
        name: 'publishToLynx',
        message: 'Should this graphic be published to Lynx (available to Reuters staff)?',
        initial: false,
      }, {
        type: 'confirm',
        name: 'publishToMedia',
        message: 'Should this graphic be published to Connect (available to clients)?',
        initial: false,
      }];

      const { isCorrection, publishToLynx, publishToMedia } = await prompts(questions);

      const MEDIA = publishToMedia ? ['media-interactive'] : false;
      const LYNX = publishToLynx ? ['interactive'] : false;

      this.packageMetadata = await this.getPackMetadata();
      await this.updateGraphicPack(this.packageMetadata);

      await this.SERVER_CLIENT.publishGraphic([], MEDIA, LYNX, isCorrection);
    }

    console.log(chalk`\n\nPublished to: {green ${pkg.homepage}}\n`);
  },
};
