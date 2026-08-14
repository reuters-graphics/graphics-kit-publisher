import { cloneDeep, mergeWith } from 'es-toolkit';
import type { Config, UserConfig } from './types';
import { ASSETS_DIR } from '../constants/build';

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
  // cloneDeep because mergeWith mutates its target, and the target here is the
  // shared defaultConfig singleton — without it, one defineConfig call would
  // leak into the next.
  return mergeWith(
    cloneDeep(defaultConfig),
    userConfig,
    replaceArrays
  ) as Config;
};

/**
 * Make a user's array replace the default outright, rather than merging into it
 * index by index.
 *
 * The default merge is positional, so `rootBranches: ['develop']` over a default
 * of `['main', 'master']` would quietly yield `['develop', 'master']` — the user
 * asks for one root branch and silently gets two. `[]` couldn't clear a default
 * at all. Replacing is what anyone writing a config list expects, and it's what
 * makes a non-empty array default safe to ship.
 *
 * Returning `undefined` for everything else leaves object merging alone, so
 * partial config keeps working as before.
 */
const replaceArrays = (_target: unknown, source: unknown) =>
  Array.isArray(source) ? source : undefined;

export const defaultConfig: Config = {
  build: {
    scripts: {
      preview: 'build:preview',
      production: 'build',
    },
    outDir: 'dist/',
    assetsDir: ASSETS_DIR,
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
    separateAssets: 'project-files/',
  },
  embedTemplate: {
    declaration: ({ embedUrl, embedSlug }) =>
      `<div id="${embedSlug}"></div><script type="text/javascript">new pym.Parent("${embedSlug}", "${embedUrl}", {});</script>`,
    dependencies: () =>
      '<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>',
  },
  publishingLocations: [],
  preview: {
    perBranch: true,
    rootBranches: ['main', 'master'],
  },
  ai: 'prompt',
};
