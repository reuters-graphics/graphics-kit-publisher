import { toMerged } from 'es-toolkit';
import type { Config, UserConfig } from './types';

export type { Config } from './types';
export { validateConfig } from './validate';

/**
 * Combine user defined configuration options with publisher defaults.
 *
 * Create a `publisher.config.ts` file in the root of your project
 * and export this function, passing your project's publishing
 * config values.
 *
 * @example
 * ```typescript
 * // publisher.config.ts
 * import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
 *
 * export default definedConfig({
 *   // Your config values ...
 * });
 * ```
 * @param userConfig User config
 * @returns User config merged with defaults
 */
export const defineConfig = (userConfig: UserConfig) => {
  return toMerged(defaultConfig, userConfig) as Config;
};

export const defaultConfig: Config = {
  build: {
    scripts: {
      preview: 'build:preview',
      production: 'build',
    },
    outDir: 'dist/',
  },
  packLocations: {
    dotcom: 'dist/',
    embeds: 'dist/embeds/{locale}/{slug}/',
    statics: 'media-assets/{locale}/{slug}/',
  },
  metadataPointers: {
    pack: {
      rootSlug: 'locales/en/content.json?story.rootSlug',
      wildSlug: 'locales/en/content.json?story.wildSlug',
      desk: {
        path: '~/.reuters-graphics/profile.json?desk',
        promptAsInitial: true,
      },
      language: 'en',
      title: 'dist/index.html?title',
      description: 'dist/index.html?meta.og:description',
      byline: 'locales/en/content.json?story.authors',
      contactEmail: '~/.reuters-graphics/profile.json?email',
    },
    edition: {
      title: 'index.html?title',
      description: 'index.html?meta.og:description',
    },
  },
  archiveEditions: {
    docs: {
      'README.txt': ({ embedUrl }) => `${embedUrl}`,
      'EMBED.txt': ({ embedUrl }) => `${embedUrl}`,
    },
    ignore: [],
  },
  embedTemplate: {
    declaration: ({ embedUrl, embedSlug }) =>
      `<div id="${embedSlug}"></div><script type="text/javascript">new pym.Parent("${embedSlug}", "${embedUrl}", {});</script>`,
    dependencies: () =>
      '<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>',
  },
  publishingLocations: [
    {
      archive: 'public',
      availableLocations: {
        lynx: false,
        connect: false,
      },
    },
  ],
};
