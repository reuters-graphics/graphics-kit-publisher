import { utils } from '@reuters-graphics/graphics-bin';
import url from 'url';
import urljoin from 'url-join';

const TESTING_BASE_PATH = 'https://www.reuters.com/graphics/testing/';

const getRootRelativePath = (urlPath: string) => {
  if (!urlPath) return '';
  const page = new url.URL(urlPath);
  return urlPath.replace(`${page.protocol}//${page.host}`, '');
};

const removeTrailingSlash = (urlPath: string) => {
  return urlPath.replace(/\/$/, '');
};

const ensureTrailingSlash = (urlPath: string) => {
  if (/\/$/.test(urlPath)) return urlPath;
  return urlPath + '/';
};

const getBasePathByMode = (
  mode: 'dev' | 'test' | 'preview' | 'prod' = 'dev'
) => {
  const pkg = utils.getPkg();
  switch (mode) {
    case 'test':
      return TESTING_BASE_PATH;
    case 'preview':
      return pkg.reuters.preview;
    case 'prod':
      return pkg.homepage || '';
    default:
      return '';
  }
};

interface Options {
  /**
   * Whether the path should include a trailing slash
   */
  trailingSlash: boolean;
  /**
   * Whether the base path should be fully specified or root-relative
   */
  rootRelative: boolean;
}

/**
 * Returns a root relative base path that can be used to set
 * the base path config of your page builder using the URLs the
 * graphics kit publisher saves to your package.json.
 *
 * @example
 * ```typescript
 * // svelte.config.js
 * import { getBasePath } from '@reuters-graphics/graphics-kit-publisher';
 *
 * const mode = process.env.NODE_ENV === 'production' ? 'prod' : 'dev';
 * const basePath = getBasePath(mode, { trailingSlash: false, rootRelative: true });
 * // e.g., "/graphics/ROOT-SLUG/WILD/ayzrxlqerve"
 * const assetsPath = getBasePath(mode, 'cdn', {
 *   trailingSlash: false,
 *   rootRelative: false,
 * });
 * // e.g., "https://www.reuters.com/graphics/ROOT-SLUG/WILD/ayzrxlqerve/cdn"
 *
 * const config = {
 *   kit: {
 *     paths: {
 *       base: basePath,
 *       assets: assetsPath,
 *     },
 *   },
 * };
 *
 * export default config;
 * ```
 * ### Modes and sources
 *
 * #### `dev`
 * Returns the default: `''`
 *
 * #### `test`
 * Returns a static fake URL you can use for testing.
 *
 * #### `preview`
 * Returns the URL saved to `"reuters.graphic.preview"` in package.json.
 *
 * #### `prod`
 * Returns the URL saved to `"homepage"` in package.json.
 *
 * @param mode Mode, `dev`, `test`, `preview` or `prod`
 * @param optionsOrAddPath Options or a URL path part to add to the base path
 * @param options Options if path part to add supplied
 * @returns Base path
 */
export const getBasePath = (
  mode: 'dev' | 'test' | 'preview' | 'prod' = 'dev',
  optionsOrAddPath: Options | string = {
    trailingSlash: false,
    rootRelative: true,
  },
  options: Options = { trailingSlash: false, rootRelative: true }
) => {
  const addPath =
    typeof optionsOrAddPath === 'string' ? optionsOrAddPath : undefined;
  const opts = addPath ? options : (optionsOrAddPath as Options);
  let basePath = getBasePathByMode(mode);
  if (basePath === '') {
    return addPath ? urljoin(basePath, addPath) : basePath;
  }
  if (addPath) {
    basePath = urljoin(basePath, addPath);
  }
  if (opts.rootRelative) {
    basePath = getRootRelativePath(basePath);
  }
  if (opts.trailingSlash) {
    basePath = ensureTrailingSlash(basePath);
  } else {
    basePath = removeTrailingSlash(basePath);
  }
  return basePath;
};
