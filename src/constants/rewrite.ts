/**
 * Sentinel the project is built against so each archive's copy of the build can
 * be rewritten to its own URL afterwards, instead of building once per archive.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */

/**
 * The distinctive part of the placeholder.
 *
 * It has to be unique in the *path*, not just the host: page builders ask for a
 * root-relative base path (`getBasePath(mode, { rootRelative: true })`), which
 * drops the origin, so a sentinel that only distinguished the host would be
 * invisible in much of the built output.
 */
export const PLACEHOLDER_TOKEN = '__GKP_BASE__';

/**
 * The base URL projects build against.
 *
 * `www.reuters.com` rather than a fake host so the value stays a valid URL and
 * satisfies the archive URL validator (`src/validators/archive.ts`), which
 * requires that hostname.
 */
export const PLACEHOLDER_BASE = `https://www.reuters.com/graphics/${PLACEHOLDER_TOKEN}/`;

/**
 * SvelteKit's stand-in host, which leaks into output when a page reads
 * `page.url.href` directly instead of the injected base URL. Not ours to fix,
 * but worth failing on: it means a page baked in a URL we can't rewrite.
 */
export const PRERENDER_HOST_TOKEN = 'sveltekit-prerender';
