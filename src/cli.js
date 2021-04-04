import {
  DEFAULT_ASSETS_DIR,
  DEFAULT_DIST_DIR,
  DEFAULT_IMAGES_DIR,
  DEFAULT_LOCALE,
  DEFAULT_LOCALES_DIR,
  DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP,
  DEFAULT_LOCALE_METADATA_FILE,
  DEFAULT_LOCALE_METADATA_TITLE_PROP,
  DEFAULT_PACK_DIR,
  DEFAULT_STATICS_DIR
} from './constants/directories';

import GraphicsPublisher from '@reuters-graphics/graphics-publisher';
import pkg from '../package.json';
import sade from 'sade';

const prog = sade('graphics-publisher');

prog
  .version(pkg.version)
  .option('-d, --dist', 'Relative path to a directory of built files we\'ll use to create your pack', DEFAULT_DIST_DIR)
  .option('-p, --pack', 'Relative path to a directory where your pack will be created', DEFAULT_PACK_DIR)
  .option('-a, --assets', 'Relative path to a directory of media assets to include with your pack', DEFAULT_ASSETS_DIR)
  .option('-s, --statics', 'Relative path to a static files directory', DEFAULT_STATICS_DIR)
  .option('-i, --images', 'Relative path to directory of images inside the static files directory', DEFAULT_IMAGES_DIR)
  .option('-l, --locales', 'Relative path to directory of translatable JSON files', DEFAULT_LOCALES_DIR)
  .option('-c, --locale', 'Default locale', DEFAULT_LOCALE);

prog
  .command('prepack')
  .option('--defaultMetadataFile', 'Relative path to a JSON file in the default locale with metadata', DEFAULT_LOCALE_METADATA_FILE)
  .option('--defaultMetadataTitle', 'Title prop in default locale metadata', DEFAULT_LOCALE_METADATA_TITLE_PROP)
  .option('--defaultMetadataDescription', 'Description prop in default locale metadata', DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP)
  .action(async(opts) => {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.prepack();
  });

prog
  .command('pack')
  .action(async(opts) => {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.pack();
  });

prog
  .command('measure')
  .option('-w, --width', 'Set a max width for images beyond which you\'ll be prompted to resize', 2600)
  .option('-z, --size', 'Set a max size in KB for images beyond which you\'ll be prompted to resize', 200)
  .action(async(opts) => {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.measure(opts);
  });

prog
  .command('upload')
  .option('--defaultMetadataFile', 'Relative path to a JSON file in the default locale with metadata', DEFAULT_LOCALE_METADATA_FILE)
  .option('--defaultMetadataTitle', 'Title prop in default locale metadata', DEFAULT_LOCALE_METADATA_TITLE_PROP)
  .option('--defaultMetadataDescription', 'Description prop in default locale metadata', DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP)
  .option('-w, --width', 'Set a max width for images beyond which you\'ll be prompted to resize', 2600)
  .option('-z, --size', 'Set a max size in KB for images beyond which you\'ll be prompted to resize', 200)
  .option('-f, --fast', 'Publish just the public edition')
  .action(async(opts) => {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.upload(opts);
  });

prog
  .command('publish')
  .option('--defaultMetadataFile', 'Relative path to a JSON file in the default locale with metadata', DEFAULT_LOCALE_METADATA_FILE)
  .option('--defaultMetadataTitle', 'Title prop in default locale metadata', DEFAULT_LOCALE_METADATA_TITLE_PROP)
  .option('--defaultMetadataDescription', 'Description prop in default locale metadata', DEFAULT_LOCALE_METADATA_DESCRIPTION_PROP)
  .action(async(opts) => {
    const graphicsPublisher = new GraphicsPublisher(opts);
    await graphicsPublisher.publish(opts);
  });

prog.parse(process.argv);
