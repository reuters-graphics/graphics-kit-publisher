const PREVIEW_HOST = 'graphics.thomsonreuters.com';
export const PREVIEW_ORIGIN = `https://${PREVIEW_HOST}`;

/**
 * How the publisher tells `getBasePath` which URL this preview is going to,
 * when that isn't simply the one saved in package.json — a branch preview lands
 * in a subdirectory of it.
 *
 * An env var for the same reason {@link PLACEHOLDER_BASE_ENV_VAR} is one: it's
 * the only channel between the publisher and the build it spawns, since page
 * builders call `getBasePath` from their own config files and there's no
 * argument to pass. Set by `buildForPreview` (`src/build/index.ts`) and read by
 * `getBasePath`; an app should never set it.
 *
 * @see PLACEHOLDER_BASE_ENV_VAR in `src/constants/rewrite.ts`
 */
export const PREVIEW_BASE_ENV_VAR = 'PUBLISHER_PREVIEW_BASE';
