import {
  DEFAULT_ASSETS_DIR,
  DEFAULT_DIST_DIR,
  DEFAULT_IMAGES_DIR,
  DEFAULT_LOCALES_DIR,
  DEFAULT_PACK_DIR,
} from './constants/directories';
import {
  DEFAULT_PACK_DESCRIPTION_PROP,
  DEFAULT_PACK_LOCALE,
  DEFAULT_PACK_METADATA_FILE,
  DEFAULT_PACK_TITLE_PROP,
} from './constants/pack';

import { DEFAULT_WARN_IMAGE_SIZE } from './constants/images';
// @ts-ignore lib
import { GraphicsPublisher } from '@reuters-graphics/graphics-publisher';
import { handleError } from './exceptions/errors';
import sade from 'sade';
// @ts-ignore pkg
import { version } from '../package.json';

const prog = sade('graphics-publisher');

prog
  .version(version)
  .option(
    '--distDir',
    "Relative path to a directory of built files we'll use to create your pack",
    DEFAULT_DIST_DIR
  )
  .option(
    '--packDir',
    'Relative path to a directory where your pack will be created',
    DEFAULT_PACK_DIR
  )
  .option(
    '--assetsDir',
    'Relative path to a directory of media assets to include with your pack',
    DEFAULT_ASSETS_DIR
  )
  .option(
    '--imagesDir',
    'Relative path to directory of images which includes the public share image',
    DEFAULT_IMAGES_DIR
  )
  .option(
    '--localesDir',
    'Relative path to directory of translatable JSON files',
    DEFAULT_LOCALES_DIR
  )
  .option('--packLocale', 'Default locale for pack', DEFAULT_PACK_LOCALE)
  .option(
    '--packMetadataFile',
    'Relative path to a JSON file in the default locale with pack metadata',
    DEFAULT_PACK_METADATA_FILE
  )
  .option(
    '--packTitleProp',
    'Title prop in default pack metadata file',
    DEFAULT_PACK_TITLE_PROP
  )
  .option(
    '--packDescriptionProp',
    'Description prop in default pack metadata file',
    DEFAULT_PACK_DESCRIPTION_PROP
  );

prog.command('prepack').action(async (opts) => {
  try {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.prepack();
  } catch (error) {
    handleError(error);
  }
});

prog.command('pack').action(async (opts) => {
  try {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.pack();
  } catch (error) {
    handleError(error);
  }
});

prog
  .command('measure-images')
  .option(
    '--warnImageSize',
    "Set a max size in KB for images beyond which you'll be prompted to optimise or resize",
    DEFAULT_WARN_IMAGE_SIZE
  )
  .action(async (opts) => {
    try {
      const graphicsPublisher = new GraphicsPublisher(opts);
      await graphicsPublisher.measureImages(opts);
    } catch (error) {
      handleError(error);
    }
  });

prog
  .command('upload')
  .option(
    '--warnImageSize',
    "Set a max size in KB for images beyond which you'll be prompted to optimise or resize",
    DEFAULT_WARN_IMAGE_SIZE
  )
  .option('--fast', 'Upload just the public edition, ignoring media embeds')
  .action(async (opts) => {
    try {
      const graphicsPublisher = new GraphicsPublisher(opts);
      await graphicsPublisher.upload(opts);
    } catch (error) {
      handleError(error);
    }
  });

prog.command('publish').action(async (opts) => {
  try {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.publish();
  } catch (error) {
    handleError(error);
  }
});

prog.command('preview').action(async (opts) => {
  try {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.preview();
  } catch (error) {
    handleError(error);
  }
});

prog.parse(process.argv);
