/**
 * Directory inside the build output that holds the app's assets.
 *
 * A graphics-kit convention rather than a publisher setting: the kit's
 * `svelte.config.js` sets `paths.assets` to `getBasePath(mode, 'cdn')` and points
 * `adapter-static` at `dist/cdn`. Each archive gets its own copy of this
 * directory so it can serve itself.
 *
 * If a project ever needs to name it something else, this becomes a config
 * option — nothing else about the assembly would change.
 */
export const ASSETS_DIR = 'cdn';
