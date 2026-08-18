import url from 'url';
import urljoin from 'url-join';
import { PKG } from './pkg';
import { PLACEHOLDER_BASE_ENV_VAR } from './constants/rewrite';
import { currentBranchSlug } from './git/branch';

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
  /**
   * When the publisher is driving the build itself, it hands out a placeholder
   * base and rewrites each archive's copy of the output to that archive's own
   * URL afterwards. That's what lets one build serve every archive — and it's
   * why the publisher no longer needs a first build just to discover parts
   * before their URLs exist.
   *
   * Deliberately checked ahead of `mode`: the publisher, not the app, knows
   * whether this build is going to be rewritten. Set by `buildForProduction`
   * (`src/build/index.ts`) and by nothing else — an app should never set it.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   */
  if (process.env[PLACEHOLDER_BASE_ENV_VAR])
    return process.env[PLACEHOLDER_BASE_ENV_VAR];

  switch (mode) {
    case 'test':
      return TESTING_BASE_PATH;
    /**
     * One preview per git branch, so a feature branch's preview doesn't
     * overwrite another's. The branch is resolved from git (or the CI
     * environment) and looked up in the map the publisher wrote to
     * `package.json` before spawning this build.
     *
     * Reads the *recorded* entry rather than composing `root + slug`: a branch
     * nobody has previewed yet then resolves to nothing, instead of to a URL with
     * no files behind it.
     *
     * Read-only, deliberately. Minting a preview is `uploadPreview`'s job — a
     * build config that wrote to `package.json` as a side effect of being loaded
     * would be a nasty surprise, and in a publisher-driven run it would race the
     * publisher's own write.
     */
    case 'preview':
      return PKG.preview.branch(currentBranchSlug()).url ?? '';
    case 'prod':
      return PKG.homepage || '';
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
 * Returns the preview URL for the **current git branch**, from
 * `"reuters.preview.branches"` in package.json — the publisher writes it there
 * before running your preview build.
 *
 * The branch is taken from `PUBLISHER_PREVIEW_BRANCH`, then GitHub Actions'
 * `GITHUB_HEAD_REF` / `GITHUB_REF_NAME`, then `git rev-parse`. Set
 * `PUBLISHER_PREVIEW_BRANCH` to override it — useful on a detached HEAD, where
 * there's no branch to find.
 *
 * Returns `''` if this branch has no preview yet, the same way `prod` does before
 * a first upload.
 *
 * #### `prod`
 * Returns the URL saved to `"homepage"` in package.json.
 *
 * ### Builds the publisher runs itself
 *
 * When the publisher builds your project on the way to the graphics server, it
 * hands out a placeholder base URL instead, and swaps it for each archive's own
 * URL as that archive is packed. That's what lets one build serve every archive.
 *
 * Nothing to do on your side — keep calling this function as above. A build you
 * run yourself is unaffected and still gets the URLs from package.json.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
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
    return addPath && opts.rootRelative ? urljoin(basePath, addPath) : basePath;
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
