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
const tmpRoot = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'gkp-')));

/** The project the test runs in — the cwd for the whole test file. */
export const projectDir = path.join(tmpRoot, 'project');

/**
 * A stand-in home directory, because the publisher reads `~/…` pointers: the
 * desk in `~/.reuters-graphics/profile.json`, the graphics server credentials in
 * `~/.reuters-graphics/graphics-server.json`. `os.homedir()` honours `$HOME` and
 * `graphics-bin` expands `~` at call time, so redirecting it keeps tests off the
 * developer's real profile in both directions — fixtures can't clobber it, and a
 * missing fixture can't silently read it instead.
 *
 * A sibling of the project rather than a directory inside it, so
 * {@link resetProject} and the project's own globs never see it.
 */
const homeDir = path.join(tmpRoot, 'home');

/** Files every temp project starts with, recreated by {@link resetProject}. */
const seedProject = () => {
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'package.json'), '{}');
  /**
   * Symlink the repo's node_modules so the temp project resolves dependencies
   * like a real project would — jiti loading a `publisher.config.ts` that
   * imports this package needs it.
   */
  const nodeModules = path.join(projectDir, 'node_modules');
  if (!fs.existsSync(nodeModules))
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), nodeModules, 'dir');
  fs.mkdirSync(homeDir, { recursive: true });
};

seedProject();
process.chdir(projectDir);
process.env.HOME = homeDir;
process.env.USERPROFILE = homeDir;

/**
 * Lets `loadUserConfig` resolve `@reuters-graphics/graphics-kit-publisher` to
 * source when a fixture `publisher.config.ts` imports it — the temp project has
 * no install of the package under test.
 *
 * @see src/config/load.ts
 */
process.env.PUBLISHER_SELF_TEST = 'true';

/** A tree of files to write. Nested objects are directories. */
export interface ProjectFiles {
  [pathSegment: string]: string | Buffer | ProjectFiles;
}

/**
 * Write files into the temp project, creating parent directories as needed.
 * Keys are project-relative paths — slashes and nested objects both work, and a
 * key ending in `/` makes an empty directory.
 *
 * ```ts
 * writeProject({
 *   'package.json': JSON.stringify({ homepage: 'https://reut.rs/x' }),
 *   'dist/index.html': '<html></html>',
 *   media: { 'graphic.jpg': fs.readFileSync(fixture) },
 *   'dist/empty/': '',
 * });
 * ```
 */
export const writeProject = (files: ProjectFiles, dir = projectDir) => {
  for (const [filePath, contents] of Object.entries(files)) {
    const absPath = path.join(dir, filePath);
    if (typeof contents === 'string' || Buffer.isBuffer(contents)) {
      if (filePath.endsWith('/')) {
        fs.mkdirSync(absPath, { recursive: true });
        continue;
      }
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, contents);
      continue;
    }
    fs.mkdirSync(absPath, { recursive: true });
    writeProject(contents, absPath);
  }
  return projectDir;
};

/**
 * Write files into the stand-in {@link homeDir}, for code that reads `~/…`
 * pointers like `~/.reuters-graphics/profile.json`.
 */
export const writeHome = (files: ProjectFiles) => {
  writeProject(files, homeDir);
  return homeDir;
};

/**
 * Empty the temp project and its stand-in home back to their seed state. Call in
 * a `beforeEach` when a file's tests would otherwise see each other's fixtures.
 */
export const resetProject = () => {
  for (const dir of [projectDir, homeDir]) {
    for (const entry of fs.readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
    }
  }
  seedProject();
};

/**
 * Replace the temp project's contents with `files` — {@link resetProject} then
 * {@link writeProject}. Use this when a test wants the project to contain
 * exactly these files and nothing another test left behind.
 *
 * Note it clears the stand-in home as well, so any {@link writeHome} fixtures a
 * test needs have to be written *after* this call.
 */
export const setProject = (files: ProjectFiles) => {
  resetProject();
  return writeProject(files);
};

afterAll(() => {
  // Leave the temp dir before removing it, or the cwd is a deleted directory.
  process.chdir(REPO_ROOT);
  // The whole root, not just the project — the stand-in home is its sibling.
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});
