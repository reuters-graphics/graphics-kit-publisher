const PREVIEW_HOST = 'graphics.thomsonreuters.com';
export const PREVIEW_ORIGIN = `https://${PREVIEW_HOST}`;

/**
 * Slug used when the current git branch can't be resolved — a detached HEAD, a
 * directory that isn't a git repo, a git failure, or a branch name that
 * slugifies to nothing.
 *
 * An underscore because it's the one value a real branch can *never* produce:
 * `branchSlug` (`src/git/branch.ts`) replaces underscores with dashes and then
 * trims leading dashes, so no slug ever begins with `_`. That makes this
 * collision-proof by construction rather than a bet on nobody naming a branch
 * `local`.
 *
 * It is shared, though: everyone in that state publishes here and overwrites
 * each other, which is why minting against it warns and points at
 * `PUBLISHER_PREVIEW_BRANCH`.
 */
export const FALLBACK_BRANCH_SLUG = '_';

/**
 * Overrides branch detection. For CI that checks out a detached HEAD, or anyone
 * who wants a preview path of their own choosing.
 */
export const PREVIEW_BRANCH_ENV_VAR = 'PUBLISHER_PREVIEW_BRANCH';
