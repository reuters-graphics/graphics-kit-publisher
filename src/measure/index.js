import chalk from 'chalk';
import fs from 'fs-extra';
import glob from 'glob';
import imgSize from 'image-size';
import path from 'path';
import { promisify } from 'util';
import prompts from 'prompts';
import sharp from 'sharp';
import uniqifyBasename from '../utils/uniqifyBasename';

const asyncImgSize = promisify(imgSize);

export default {
  /**
   * Measures images in the static files images directory, creates a manifest
   * in the root of that directory and offers to resize any images over width
   * or size thresholds.
   * @param {object} opts CLI options, including max width in pixels and size in KB for images
   */
  async measure({ width: maxWidth = 2600, size: maxSize = 200 }) {
    const images = glob.sync('**/*.{jpg,png,jpeg}', { cwd: this.STATIC_IMGS_DIR });
    const MANIFEST = {};
    for (const image of images) {
      const IMG_PATH = path.join(this.STATIC_IMGS_DIR, image);
      const { width, height } = await asyncImgSize(IMG_PATH);
      let sizeKB = Math.ceil(fs.statSync(IMG_PATH).size / 1024);

      MANIFEST[image] = { width, height, size: sizeKB };

      if (width > maxWidth || sizeKB > maxSize) {
        const { resize } = await prompts({
          type: 'confirm',
          name: 'resize',
          message: width > maxWidth ?
            chalk`The image {yellow ${image}} is larger than ${maxWidth} pixels wide. Would you like to resize it?` :
            chalk`The image {yellow ${image}} is larger than ${maxSize} KB. Would you like to resize it?`,
          initial: true,
        });
        if (!resize) continue;

        // Create a temp file path
        const RESIZED_IMG_PATH = uniqifyBasename(IMG_PATH);

        const { resizeWidth } = await prompts({
          type: 'number',
          name: 'resizeWidth',
          message: chalk`What width should {yellow ${image}} be in pixels?`,
          initial: maxWidth,
        });

        // Resize file and save to temp file
        await sharp(IMG_PATH)
          .resize({ width: resizeWidth })
          .toFile(RESIZED_IMG_PATH);

        // Replace file with resized temp file
        fs.unlinkSync(IMG_PATH);
        fs.copyFileSync(RESIZED_IMG_PATH, IMG_PATH);
        fs.unlinkSync(RESIZED_IMG_PATH);

        sizeKB = Math.ceil(fs.statSync(IMG_PATH).size / 1024);
        MANIFEST[image].width = resizeWidth;
        MANIFEST[image].size = sizeKB;
      }
    }
    fs.writeJSONSync(path.join(this.STATIC_IMGS_DIR, 'manifest.json'), MANIFEST);
  },
};
