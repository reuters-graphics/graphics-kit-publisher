import { DEFAULT_WARN_IMAGE_SIZE } from '../constants/images';
import chalk from 'chalk';
import cliProgress from 'cli-progress';
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
  warnImageSize: DEFAULT_WARN_IMAGE_SIZE,
};

const OPTIMISE_MIN = 80;
const OPTIMISE_DEFAULT = 85;

export class MeasureImages {
  IMAGES_DIR: string;

  constructor(imagesDir: string) {
    this.IMAGES_DIR = imagesDir;
  }

  getImgManifest() {
    const MANIFEST_PATH = path.join(this.IMAGES_DIR, 'manifest.json');
    // Ensure it's there
    if (!fs.existsSync(MANIFEST_PATH)) {
      fs.ensureDirSync(path.dirname(MANIFEST_PATH));
      fs.writeFileSync(MANIFEST_PATH, '{}');
    }
    return fs.readJSONSync(MANIFEST_PATH);
  }

  writeImgManifest(manifest: unknown) {
    const MANIFEST_PATH = path.join(this.IMAGES_DIR, 'manifest.json');
    fs.writeJSONSync(MANIFEST_PATH, manifest);
  }

  /**
   * Measures images in the static files images directory, creates a manifest
   * in the root of that directory and offers to optimise/resize any images
   * over a size threshold.
   * @param {object} opts CLI options, including max size in KB for images
   */
  async measureImages({
    warnImageSize = DEFAULT_WARN_IMAGE_SIZE,
  } = defaultOptions) {
    const images = glob.sync('**/*.{png,jpg,jpeg}', { cwd: this.IMAGES_DIR });

    const MANIFEST = this.getImgManifest();

    const writeImg = (
      IMG_PATH: string,
      OPTIMISED_IMG_PATH: string,
      buffer: Buffer
    ) => {
      fs.writeFileSync(OPTIMISED_IMG_PATH, buffer);
      fs.unlinkSync(IMG_PATH);
      fs.copyFileSync(OPTIMISED_IMG_PATH, IMG_PATH);
      fs.unlinkSync(OPTIMISED_IMG_PATH);
    };

    const measureImage = async (image: string) => {
      const IMG_PATH = path.join(this.IMAGES_DIR, image);
      const imgSize = await asyncImgSize(IMG_PATH);
      if (!imgSize || !imgSize.width || !imgSize.height) return;
      const { width, height } = imgSize;
      const size = Math.ceil(fs.statSync(IMG_PATH).size / 1024);
      return { width, height, size };
    };

    const imageChanged = (
      manifest: { width: number; height: number; size: number },
      updated: { width: number; height: number; size: number }
    ) =>
      manifest.width !== updated.width ||
      manifest.height !== updated.height ||
      manifest.size !== updated.size;

    const resetManifest = async (image: string) => {
      const updated = await measureImage(image);
      if (!updated) return;
      if (
        // IF image not in manifest OR
        !MANIFEST[image] ||
        // image is in manifest but dimensions/size changed
        (MANIFEST[image] && imageChanged(MANIFEST[image], updated))
      ) {
        // ... write it to the manifest w/out "optimised" key,
        // which will trigger asking for optimisation.
        MANIFEST[image] = updated;
      }
    };

    const updateManifest = async (image: string, optimised = true) => {
      const updated = await measureImage(image);
      MANIFEST[image] = { ...updated, optimised };
    };

    const isPNG = (img: string) => path.extname(img).toLowerCase() === '.png';

    for (const image of images) {
      await resetManifest(image);
    }

    const oversizeImages = Object.keys(MANIFEST)
      // We haven't already asked to optimise the image
      .filter((img) => 'optimised' in MANIFEST[img] === false)
      // and size is above warn size
      .filter((img) => MANIFEST[img].size > warnImageSize);

    // Don't prompt for optimising images in serverless env
    if (isServerless()) {
      this.writeImgManifest(MANIFEST);
      return;
    }

    if (oversizeImages.length === 0) {
      this.writeImgManifest(MANIFEST);
      return;
    }

    const { operation } = await prompts.prompt({
      type: 'select',
      name: 'operation',
      message: chalk`We found {cyan ${oversizeImages.length}} new images in your project larger than {yellow ${warnImageSize}KB}.\n\nYou should probably optimise or resize these images to reduce their file size. We can do that now or you can optimise all these images in bulk.\n\nWhat do you want to do?`,
      choices: [
        { title: 'Resize/optimise each one', value: 'each' },
        { title: 'Optimise them all together', value: 'all' },
        { title: 'Do nothing', value: null },
      ],
      initial: 0,
    });

    if (!operation) {
      this.writeImgManifest(MANIFEST);
      return;
    }

    if (operation === 'all') {
      const { quality } = await prompts.prompt({
        type: 'number',
        name: 'quality',
        message: chalk`OK, choose an optimisation level for your oversize images.\n{grey 80 - 100 least optimised/highest quality}\n`,
        initial: OPTIMISE_DEFAULT,
        min: OPTIMISE_MIN,
        max: 100,
      });

      const progressBar = new cliProgress.SingleBar(
        {
          format: `⚙️ Optimising ${
            oversizeImages.length
          } images: [{bar}] ${chalk.green('{percentage}%')}`,
        },
        cliProgress.Presets.shades_grey
      );
      progressBar.start(oversizeImages.length - 1, 0);

      let totalRawSize = 0;
      let totalOptimisedSize = 0;
      for (const image of oversizeImages) {
        totalRawSize += MANIFEST[image].size;
        progressBar.update(oversizeImages.indexOf(image));
        const IMG_PATH = path.join(this.IMAGES_DIR, image);
        const OPTIMISED_IMG_PATH = uniqifyBasename(IMG_PATH);

        const buffer =
          isPNG(image) ?
            await sharp(fs.readFileSync(IMG_PATH)).png({ quality }).toBuffer()
          : await sharp(fs.readFileSync(IMG_PATH))
              .jpeg({ quality, progressive: true })
              .toBuffer();

        writeImg(IMG_PATH, OPTIMISED_IMG_PATH, buffer);
        await updateManifest(image);
        totalOptimisedSize += MANIFEST[image].size;
      }
      progressBar.stop();
      const savedKB = totalRawSize - totalOptimisedSize;
      const avgSavedKB = Math.round(savedKB / oversizeImages.length);
      const savedPercent = Math.round((savedKB / totalRawSize) * 100);
      console.log(
        chalk`You saved about {green ${avgSavedKB}KB} per image for a total {green ${savedPercent}%} file size saved!`
      );
    }

    if (operation === 'each') {
      console.log(chalk`OK, let's go through your oversize images...`);

      for (const image of oversizeImages) {
        const { size, width } = MANIFEST[image];
        const { option } = await prompts.prompt({
          type: 'select',
          name: 'option',
          message: chalk`{cyan ${image}} is {yellow ${size}KB} and {yellow ${width}px} wide. What should we do?`,
          choices: [
            { title: 'Optimise it', value: 'optimise' },
            { title: 'Resize it', value: 'resize' },
            { title: 'Do both', value: 'both' },
            { title: 'Do nothing', value: null },
          ],
          initial: 0,
        });

        if (!option) {
          console.log(chalk`OK, we'll ignore that one from now on.`);
          await updateManifest(image, false);
          continue;
        }

        const IMG_PATH = path.join(this.IMAGES_DIR, image);
        const OPTIMISED_IMG_PATH = uniqifyBasename(IMG_PATH);

        if (option === 'resize' || option === 'both') {
          const { resizeWidth } = await prompts.prompt({
            type: 'number',
            name: 'resizeWidth',
            message: chalk`What width should {cyan ${image}} be in pixels (currently {yellow ${Math.round(
              width
            )}px})?`,
            initial: Math.round(MANIFEST[image].width * 0.75),
          });

          const buffer = await sharp(fs.readFileSync(IMG_PATH))
            .resize({ width: resizeWidth })
            .toBuffer();
          writeImg(IMG_PATH, OPTIMISED_IMG_PATH, buffer);
          await updateManifest(image, option === 'both');
        }

        if (option === 'optimise' || option === 'both') {
          const { quality } = await prompts.prompt({
            type: 'number',
            name: 'quality',
            message: chalk`Choose an optimisation level for {cyan ${image}}.\n{grey 80 - 100 least optimised/highest quality}\n`,
            initial: OPTIMISE_DEFAULT,
            min: OPTIMISE_MIN,
            max: 100,
          });

          const buffer =
            isPNG(image) ?
              await sharp(fs.readFileSync(IMG_PATH)).png({ quality }).toBuffer()
            : await sharp(fs.readFileSync(IMG_PATH))
                .jpeg({ quality, progressive: true })
                .toBuffer();
          writeImg(IMG_PATH, OPTIMISED_IMG_PATH, buffer);
          await updateManifest(image);
        }

        const { size: resizeSize } = MANIFEST[image];
        console.log(
          chalk`{cyan ${image}} is now ${resizeSize}KB. You saved {green ${
            size - resizeSize
          }KB}!`
        );
      }
    }

    this.writeImgManifest(MANIFEST);
  }
}
