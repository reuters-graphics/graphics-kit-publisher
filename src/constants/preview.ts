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

/**
 * Directory branch previews live in, beneath the project's preview root.
 *
 * Reserved rather than putting the branch slug straight under the root, because
 * the root holds the canonical build's own top-level directories — `cdn`,
 * `embeds`, and every top-level route the project has. A branch named after any
 * of them (`world-cup-2026` is a real page *and* a plausible branch) would
 * upload itself over the canonical preview's files, corrupting exactly the
 * thing per-branch previews exist to protect.
 *
 * The leading underscore keeps it clear of route names, which can't start with
 * one in any of our page builders.
 */
export const BRANCH_DIR = '_branches';
