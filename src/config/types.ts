import type { RNGS } from '@reuters-graphics/server-client';

type Build = {
  scripts: {
    preview: string;
    production: string;
  };
  outDir: string;
};

interface PackLocations {
  /**
   * Path from project root to a directory where files
   * for dotcom pages are built.
   *
   * There must be a root `index.html` in this directory.
   *
   * Set to `false` if the project has no dotcom pages.
   *
   * Default is `dist/`.
   */
  dotcom: string | false;
  /**
   * Path pattern from project root to capture all directories where files
   * for embeddable pages are built. There must be a root
   * `index.html` in each directory found.
   *
   * Path should include capture groups for the edition's
   * `locale` and `slug`, which must be defined in the directory
   * path. For example, `dist/embeds/en/map/` would be defined with
   * capture groups `dist/embeds/{locale}/{slug}/`.
   *
   * Set to `false` if the project has no embeddable pages.
   *
   * Default is `dist/embeds/{locale}/{slug}/`.
   */
  embeds: string | false;
  /**
   * Path from project root to all directories where static files
   * for embeddable graphics are saved. There must be *at least*
   * one static file in the root of each directory. Valid static
   * files include `.eps`, `.jpg`, `.png` or `.pdf`.
   *
   * Path should include capture groups for the edition's
   * `locale` and `slug`, which must be defined in the directory
   * path. For example, `media-files/en/map/` would be defined with
   * capture groups `media-files/{locale}/{slug}/`.
   *
   * Set to `false` if the project has no static files.
   *
   * Default is `media-files/{locale}/{slug}/`.
   */
  statics: string | false;
}

/**
 * Metadata pointer path.
 *
 * Pointer paths are a compound string of the relative path to a file
 * and the JSON path to data value within it.
 *
 * @example
 * ```javascript
 * 'locales/en/content.json?story.title'
 * ```
 *
 * See more examples at [@reuters-graphics/graphics-bin](https://reuters-graphics.github.io/graphics-bin/functions/utils.fs.get.html).
 */
type MetadataPointerPath = string;

/**
 * Metadata pointer with additional options to format the value
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MetadataPointerWithOptions<I = any, O = any> = {
  path: MetadataPointerPath;
  /**
   * Format the value found in the metadata file.
   *
   * @example
   * ```typescript
   * {
   *   path: 'locales/en/content.json?story.authors',
   *   format: (value: string[]) => {
   *     return value.join(', ');
   *   }
   * }
   * ```
   * @param value Value from metadata file
   * @returns Formatted value
   */
  format?: (value: I) => O;
  /**
   * Validate the value found in the metadata file before using it.
   *
   * **Note:** If a format function is supplied with the pointer, it
   * will be run _before_ checking if the value is valid.
   *
   * @example
   * ```typescript
   * {
   *   path: '~/.reuters-graphics/profile.json?email',
   *   validate: (value: string) => {
   *     return /.+@thomsonreuters\.com$/.test(value);
   *   },
   * }
   * ```
   * @param value Value from metadata file
   */
  validate?: (value: I) => boolean;
  /**
   * If the pointer finds a value, use it as the initial value
   * in a prompt to the user. If set to `false` or not defined, skips
   * the prompt if the pointer finds a value and returns it directly.
   */
  promptAsInitial?: boolean;
};

/**
 * Metadata pointer.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MetadataPointer<I = any, O = any> =
  | MetadataPointerPath
  | MetadataPointerWithOptions<I, O>
  | false;

/**
 * Metadata pointers define files and paths to data within them
 * which fill in essential metadata for the graphics pack and editions.
 */
interface MetadataPointers {
  /**
   * Pointers to metadata for the graphic pack.
   */
  pack: {
    /**
     * @defaultValue `'locales/en/content.json?story.rootSlug'`
     */
    rootSlug: MetadataPointer<string, string>;
    /**
     * @defaultValue `'locales/en/content.json?story.wildSlug'`
     */
    wildSlug: MetadataPointer<string, string>;
    /**
     * @defaultValue `{ path: '~/.reuters-graphics/profile.json?desk', promptAsInitial: true }`
     */
    desk: MetadataPointer<string, string>;
    /**
     * @defaultValue `'en'`
     */
    language: RNGS.Language | MetadataPointer<string, string>;
    /**
     * @defaultValue `'dist/index.html?title'`
     */
    title: MetadataPointer<string, string>;
    /**
     * @defaultValue `'dist/index.html?meta.og:description'`
     */
    description: MetadataPointer<string, string>;
    /**
     * @defaultValue `'locales/en/content.json?story.authors'`
     */
    byline: MetadataPointerPath;
    /**
     * @defaultValue `'~/.reuters-graphics/profile.json?email'`
     */
    contactEmail: MetadataPointer<string, string>;
  };
  /**
   * Pointers to metadata for individual editions.
   */
  edition: {
    /**
     * @defaultValue `'index.html?title'`
     */
    title: MetadataPointer<string, string>;
    /**
     * @defaultValue `'index.html?meta.og:description'`
     */
    description: MetadataPointer<string, string>;
  };
}

type DocsValue =
  | string
  | ((docsArgs: {
      embedUrl: string;
      embedSlug?: string;
      year?: string;
    }) => string);

interface ArchiveEditions {
  docs: {
    'README.txt': DocsValue;
    [filePath: string]: DocsValue;
  };
  /**
   * When creating the archive for clients, ignore these files in addition to
   * those already ignored via .gitignore.
   */
  ignore: string[];
  /**
   * A directory of assets that will be stored remotely on S3
   * and made available for clients to download separately. This
   * is useful for precursor assets, such as Illustrator or Photoshop
   * files.
   *
   * @defaultValue `'project-files/'`
   */
  separateAssets: string | false;
}

type EmbedTemplate = {
  declaration: (templateArgs: {
    embedUrl: string;
    embedSlug: string;
  }) => string;
  dependencies: (templateArgs: {
    embedUrl: string;
    embedSlug: string;
  }) => string;
};

interface EditionPublishingLocations {
  archive: string | RegExp;
  availableLocations: {
    lynx: boolean;
    connect: boolean;
  };
}

type PublishingLocations = EditionPublishingLocations[];

export type Config = {
  build: Build;
  packLocations: PackLocations;
  metadataPointers: MetadataPointers;
  archiveEditions: ArchiveEditions;
  embedTemplate: EmbedTemplate;
  publishingLocations: PublishingLocations;
};

type PartialDeep<K> = {
  [attr in keyof K]?: K[attr] extends object ? PartialDeep<K[attr]> : K[attr];
};

export type UserConfig = PartialDeep<Config>;
