import {
  DEFAULT_WARN_IMAGE_SIZE,
  DEFAULT_WARN_IMAGE_WIDTH
} from '../constants/images';
import { getOK, writeOK } from '../utils/getImgSizeOK';

import chalk from 'chalk';
import fs from 'fs-extra';
import glob from 'glob';
import imgSize from 'image-size';
import isServerless from '../utils/isServerless';
import path from 'path';
import { promisify } from 'util';
import prompts from 'prompts';
import sharp from 'sharp';
import uniqifyBasename from '../utils/uniqifyBasename';

const asyncImgSize = promisify(imgSize);

const defaultOptions = {
  warnImageWidth: DEFAULT_WARN_IMAGE_WIDTH,
  warnImageSize: DEFAULT_WARN_IMAGE_SIZE,
};

export default {
  /**
   * Measures images in the static files images directory, creates a manifest
   * in the root of that directory and offers to optimise/ resize any images
   * over a size threshold.
   * @param {object} opts CLI options, including max width in pixels and size in KB for images
   */
  async measureImages({
    warnImageWidth = DEFAULT_WARN_IMAGE_WIDTH,
    warnImageSize = DEFAULT_WARN_IMAGE_SIZE,
  } = defaultOptions) {
    const images = glob.sync('**/*.{jpg,jpeg}', { cwd: this.IMAGES_DIR });
    const MANIFEST = {};
    const writeManifest = () => fs.writeJSONSync(path.join(this.IMAGES_DIR, 'manifest.json'), MANIFEST);
    const OK_IMAGES = getOK();

    for (const image of images) {
      const IMG_PATH = path.join(this.IMAGES_DIR, image);
      const { width, height } = await asyncImgSize(IMG_PATH);
      const size = Math.ceil(fs.statSync(IMG_PATH).size / 1024);
      MANIFEST[image] = { width, height, size };
    }

    const oversizeImages = Object.keys(MANIFEST).filter(img => MANIFEST[img].size > warnImageSize);

    // Don't prompt for optimising images in serverless env
    if (isServerless()) {
      writeManifest();
      return;
    }

    if (oversizeImages.length === 0) {
      writeManifest();
      return;
    }

    const { confirm } = await prompts.prompt({
      type: 'confirm',
      name: 'confirm',
      message: chalk`We found {yellow ${oversizeImages.length}} images in your project larger than ${warnImageSize} KB.\n\nYou should probably optimise or resize these images to reduce their file size. We can do that now. Do you want to?`,
      initial: true,
    });

    if (!confirm) {
      writeManifest();
      return;
    }

    for (const image of oversizeImages) {
      if (OK_IMAGES.indexOf(image) > -1) continue;
      const { size } = MANIFEST[image];
      const { option } = await prompts.prompt({
        type: 'select',
        name: 'option',
        message: chalk`{yellow ${image}} is ${size} KB. What should we do?`,
        choices: [
          { title: 'Optimise it', value: 'optimise' },
          { title: 'Resize it', value: 'resize' },
          { title: 'Do nothing', value: null },
        ],
        initial: 0,
      });

      if (!option) {
        OK_IMAGES.push(image);
        continue;
      }

      const IMG_PATH = path.join(this.IMAGES_DIR, image);
      const OPTIMISED_IMG_PATH = uniqifyBasename(IMG_PATH);

      if (option === 'resize') {
        const { resizeWidth } = await prompts.prompt({
          type: 'number',
          name: 'resizeWidth',
          message: chalk`What width should {yellow ${image}} be in pixels?`,
          initial: warnImageWidth,
        });

        const buffer = await sharp(fs.readFileSync(IMG_PATH))
          .resize({ width: resizeWidth })
          .toBuffer();
        fs.writeFileSync(OPTIMISED_IMG_PATH, buffer);
      }

      if (option === 'optimise') {
        const { quality } = await prompts.prompt({
          type: 'number',
          name: 'quality',
          message: chalk`What quality level should we use to optimise {yellow ${image}}?`,
          initial: 75,
          min: 1,
          max: 100,
        });

        const buffer = await sharp(fs.readFileSync(IMG_PATH))
          .jpeg({ quality, progressive: true })
          .toBuffer();
        fs.writeFileSync(OPTIMISED_IMG_PATH, buffer);
      }

      fs.unlinkSync(IMG_PATH);
      fs.copyFileSync(OPTIMISED_IMG_PATH, IMG_PATH);
      fs.unlinkSync(OPTIMISED_IMG_PATH);

      const { width: resizeWidth, height: resizeHeight } = await asyncImgSize(IMG_PATH);
      const resizeSize = Math.ceil(fs.statSync(IMG_PATH).size / 1024);
      MANIFEST[image].width = resizeWidth;
      MANIFEST[image].height = resizeHeight;
      MANIFEST[image].size = resizeSize;

      console.log(chalk`{yellow ${image}} is now ${resizeSize} KB. You saved {green ${size - resizeSize} KB}!`);
    }

    writeManifest();
    writeOK(OK_IMAGES);
  },
};
