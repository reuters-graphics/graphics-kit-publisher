import {
  DEFAULT_ASSETS_DIR,
  DEFAULT_DIST_DIR,
  DEFAULT_IMAGES_DIR,
  DEFAULT_LOCALES_DIR,
  DEFAULT_PACK_DIR,
} from './directories';
import {
  DEFAULT_PACK_DESCRIPTION_PROP,
  DEFAULT_PACK_LOCALE,
  DEFAULT_PACK_METADATA_FILE,
  DEFAULT_PACK_TITLE_PROP,
} from './pack';

import { DEFAULT_WARN_IMAGE_SIZE } from './images';

/**
 * Default options for the `GraphicsPublisher`
 */
export const defaultOptions = {
  /**
   * Relative path to the directory where your page builder will build your source files.
   *
   * - The dist directory must have an `index.html` file at its root, which includes an `og:image` metatag (used to create a preview image for the graphics pack).
   * - All static assets must be included in a separate root-level directory inside the dist folder, e.g., `cdn/` below, and must be absolutely referenced from any HTML page in the project.
   * - All embeddable graphic pages must be contained in a root-level directory named `embeds/` and placed in folders representing a valid locale code and a unique slug within that locale, e.g., `en/chart/index.html` below.
   * - Additional pages can be named whatever they need to be as long as they don't collide with `embeds` or the static assets directory.
   *
   * ```bash
   * dist/
   *   cdn/
   *     js/ ...
   *     css/ ...
   *     images/ ...
   *   index.html
   *   a-second-page/
   *     index.html
   *   embeds/
   *     en/
   *       chart/
   *         index.html
   * ```
   *
   * @defaultValue `dist`
   */
  distDir: DEFAULT_DIST_DIR,
  /**
   * Relative path to a temporary directory where the publisher can create the `zip` archives that make up the graphics pack for the RNGS server.
   *
   * ```bash
   * graphics-pack/
   *   public.zip
   *   media-en-chart.zip
   *   media-en-map.zip
   * ```
   *
   * @defaultValue `graphics-pack`
   */
  packDir: DEFAULT_PACK_DIR,
  /**
   * Relative path to a media assets directory containing flat JPG and EPS files that will be included with the media editions uploaded to the RNGS server. They must be structured using the same directory scheme as embeds in the dist directory -- a folder for a valid locale and for a unique slug within the locale. The JPG and EPS filenames can be whatever you want them to be.
   *
   * ```bash
   * media-assets/
   *   en/
   *     chart/
   *       chart.eps
   *       chart.jpg
   *     map/
   *       my-map.eps
   *       map-preview.jpg
   * ```
   *
   * If you have an embeddable page using the same locale/slug scheme as a set of flat assets, the publisher will upload the JPG and EPS file _with_ the embeddable version of the same graphic.
   *
   * ```bash
   * dist/
   *   embeds/
   *     en/
   *       chart/
   *         index.html
   * media-assets/
   *   en/
   *     chart/
   *       chart.eps
   *       chart.jpg
   * graphics-pack/
   *   media-en-chart.zip  👈 Contains both embeddable graphic and flats
   * ```
   *
   * @defaultValue `media-assets`
   */
  assetsDir: DEFAULT_ASSETS_DIR,
  /**
   * Relative path to an images directory containing at least the share image referenced in the metatag in the root `index.html` file in the dist directory.
   *
   * ```bash
   * src/
   *   statics/
   *     images/
   *       share-card.jpg
   * ```
   *
   * @defaultValue `src/statics/images`
   */
  imagesDir: DEFAULT_IMAGES_DIR,
  /**
   * Relative path to a locales directory containing structured data used to translate the content of your page. The publisher assumes this directory has sub-directories named using a valid locale code, including at least the default locale code for the pack (`packLocale`, usually `'en'`).
   *
   * Otherwise, the publisher assumes one JSON file (`packMetadataFile`) within this default locale sub-directory contains a title (`packTitleProp`) and description (`packDescriptionProp`) for the pack.
   *
   * ```bash
   * locales/
   *   en/
   *     content.json
   * ```
   *
   * @defaultValue `locales`
   */
  localesDir: DEFAULT_LOCALES_DIR,
  /**
   * Default local of the pack. Must correspond to a directory inside the `localesDir`.
   *
   * @defaultValue `en`
   */
  packLocale: DEFAULT_PACK_LOCALE,
  /**
   * Name of the JSON file inside `{localesDir}`/`{packLocale}` that contains SEO metadata.
   *
   * @defaultValue `content.json`
   */
  packMetadataFile: DEFAULT_PACK_METADATA_FILE,
  /**
   * Property within the `packMetadataFile` that contains the SEO title for the page.
   *
   * @defaultValue `SEOTitle`
   */
  packTitleProp: DEFAULT_PACK_TITLE_PROP,
  /**
   * Property within the `packMetadataFile` that contains the SEO description for the page.
   *
   * @defaultValue `SEODescription`
   */
  packDescriptionProp: DEFAULT_PACK_DESCRIPTION_PROP,
};

export const defaultUploadOptions = {
  /**
   * Size in kb above which you will be prompted to resize an image.
   * @defaultValue 200
   */
  warnImageSize: DEFAULT_WARN_IMAGE_SIZE,
  /**
   * Upload just the public version of the graphics pack, skipping media editions.
   *
   * @defaultValue false
   */
  fast: false,
};
