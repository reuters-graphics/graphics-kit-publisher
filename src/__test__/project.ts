import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll } from 'vitest';

/**
 * Runs every test file inside a real, throwaway project directory.
 *
 * Tests here used to mock the filesystem, which coupled them to Node internals:
 * mock-fs patches `process.binding('fs')` method by method, so any fs operation
 * Node moves into a single native binding call silently escapes to the *real*
 * filesystem. Node 23 did that to `fs.rmSync`, at which point
 * `fs.rmSync('package.json')` in a test deleted this repo's own package.json.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/133
 *
 * So we don't mock. Each test file gets its own temp project as its cwd and
 * writes real fixtures into it. Nothing to intercept means nothing to break on
 * the next Node major, every dependency (glob, fs-extra, rimraf, archiver) sees
 * the same filesystem the code under test does, and no test can reach the repo.
 *
 * This module is imported by `vitest.setup.ts` so it runs before the test
 * module and its dependency graph load, which is the only seam early enough:
 * dependencies snapshot the project root at import time — e.g.
 * `@reuters-graphics/graphics-bin` evaluates
 * `const PKG = path.join(process.cwd(), 'package.json')` at module scope, and
 * `getPkgProp`/`setPkgProp` read it in ~46 places in src. A chdir in a
 * `beforeEach` would already be too late.
 *
 * Depends on `pool: 'forks'` (pinned in vitest.config.ts): `process.chdir`
 * throws in worker threads.
 */

/** Absolute path to the publisher repo, captured before we leave it. */
export const REPO_ROOT = process.cwd();

/**
 * `realpathSync` matters: on macOS `os.tmpdir()` is `/var/folders/…` while
 * `process.cwd()` reports the resolved `/private/var/folders/…`, so paths built
 * from the raw temp dir wouldn't compare equal to ones the code under test
 * derives from cwd.
 */
export const projectDir = fs.realpathSync(
  fs.mkdtempSync(path.join(os.tmpdir(), 'gkp-'))
);

/** Files every temp project starts with, recreated by {@link resetProject}. */
const seedProject = () => {
  fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  /**
   * Symlink the repo's node_modules so the temp project resolves dependencies
   * like a real project would — jiti loading a `publisher.config.ts` that
   * imports this package needs it.
   */
  const nodeModules = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModules))
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), nodeModules, 'dir');
};

seedProject();
process.chdir(projectDir);

/**
 * Lets `loadUserConfig` resolve `@reuters-graphics/graphics-kit-publisher` to
 * source when a fixture `publisher.config.ts` imports it — the temp project has
 * no install of the package under test.
 *
 * @see src/config/load.ts
 */
process.env.PUBLISHER_SELF_TEST = 'true';

/**
 * Write files into the temp project, creating parent directories as needed.
 * Keys are project-relative paths; a key ending in `/` makes an empty directory.
 *
 * ```ts
 * writeProject({
 *   'package.json': JSON.stringify({ homepage: 'https://reut.rs/x' }),
 *   'dist/index.html': '<html></html>',
 *   'dist/empty/': '',
 * });
 * ```
 */
export const writeProject = (files: Record<string, string | Buffer>) => {
  for (const [filePath, contents] of Object.entries(files)) {
    const absPath = path.join(projectDir, filePath);
    if (filePath.endsWith('/')) {
      fs.mkdirSync(absPath, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, contents);
  }
  return projectDir;
};

/**
 * Empty the temp project back to its seed state. Call in a `beforeEach` when a
 * file's tests would otherwise see each other's fixtures.
 */
export const resetProject = () => {
  for (const entry of fs.readdirSync(projectDir)) {
    if (entry === 'node_modules') continue;
    fs.rmSync(path.join(projectDir, entry), { recursive: true, force: true });
  }
  seedProject();
};

afterAll(() => {
  // Leave the temp dir before removing it, or the cwd is a deleted directory.
  process.chdir(REPO_ROOT);
  fs.rmSync(projectDir, { recursive: true, force: true });
});
