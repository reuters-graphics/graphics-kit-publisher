import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { REPO_ROOT, projectDir, resetProject, writeProject } from './project';

afterEach(() => {
  resetProject();
});

/**
 * Guards the test harness itself. If the chdir in `src/__test__/project.ts`
 * ever stops taking effect — a Vitest pool change, a setup-file ordering
 * change — tests would start operating on the real repo, which is how this
 * repo's package.json got deleted once already.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/133
 */
describe('temp project harness', () => {
  it('runs tests from a temp project, not the repo', () => {
    expect(process.cwd()).toBe(projectDir);
    expect(process.cwd()).not.toBe(REPO_ROOT);
    expect(projectDir.startsWith(fs.realpathSync(os.tmpdir()))).toBe(true);
    expect(fs.existsSync('package.json')).toBe(true);
  });

  it('resolves dependencies like a real project', () => {
    expect(fs.existsSync(path.join('node_modules', 'vitest'))).toBe(true);
  });

  it('writes and resets fixtures', () => {
    writeProject({
      'dist/nested/index.html': '<html></html>',
      'dist/empty-dir/': '',
    });
    expect(fs.readFileSync('dist/nested/index.html', 'utf8')).toBe(
      '<html></html>'
    );
    expect(fs.statSync('dist/empty-dir').isDirectory()).toBe(true);

    resetProject();

    expect(fs.existsSync('dist')).toBe(false);
    expect(fs.existsSync('package.json')).toBe(true);
    expect(fs.existsSync(path.join('node_modules', 'vitest'))).toBe(true);
  });

  it('cannot reach the repo with a relative delete', () => {
    // The shape of the bug in #133: on Node 23+ this escaped mock-fs and
    // deleted the repo's own package.json. Here it can only ever hit the copy
    // in the temp project.
    fs.rmSync('package.json');
    expect(fs.existsSync('package.json')).toBe(false);
    expect(fs.existsSync(path.join(REPO_ROOT, 'package.json'))).toBe(true);
  });
});
