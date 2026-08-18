import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Both boundaries are faked: the build (a spawned child process) and S3 (the
 * network). The temp-project filesystem stays real.
 */
const uploadLocalDirectory = vi.fn(async () => [] as unknown[]);

vi.mock('@reuters-graphics/graphics-bin', async () => {
  const actual = await vi.importActual<
    typeof import('@reuters-graphics/graphics-bin')
  >('@reuters-graphics/graphics-bin');
  return {
    ...actual,
    S3Client: class {
      uploadLocalDirectory = uploadLocalDirectory;
      clearCache = vi.fn();
    },
  };
});

/**
 * Records what `reuters.preview` looked like at the moment the build ran, which
 * is the only way to observe the ordering `uploadPreview` depends on.
 */
let previewSeenByBuild: unknown;

vi.mock('../build', () => ({
  buildForPreview: vi.fn(async () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    );
    previewSeenByBuild = pkg.reuters?.preview;
  }),
}));

import { projectDir, setProject } from '../__test__/project';
import { uploadPreview } from '.';
import { resetBranchCache } from '../git/branch';
import { PREVIEW_ORIGIN } from '../constants/preview';
import { PKG } from '../pkg';

const ROOT = 'testfiles/2026/ab12cd34ef56/';

const saved: Record<string, string | undefined> = {};
const BRANCH_ENV_VARS = [
  'PUBLISHER_PREVIEW_BRANCH',
  'GITHUB_HEAD_REF',
  'GITHUB_REF_NAME',
] as const;

beforeEach(() => {
  for (const envVar of BRANCH_ENV_VARS) {
    saved[envVar] = process.env[envVar];
    delete process.env[envVar];
  }
  uploadLocalDirectory.mockClear();
  previewSeenByBuild = undefined;
  setProject({
    'package.json': JSON.stringify({
      name: 'test-project',
      scripts: { 'build:preview': 'true' },
      reuters: { preview: { root: ROOT, branches: {} } },
    }),
    'dist/index.html': '<html></html>',
  });
  process.env.PUBLISHER_PREVIEW_BRANCH = 'feature/new-chart';
  resetBranchCache();
});

afterEach(() => {
  for (const envVar of BRANCH_ENV_VARS) {
    if (saved[envVar] === undefined) delete process.env[envVar];
    else process.env[envVar] = saved[envVar];
  }
  resetBranchCache();
});

describe('uploadPreview', () => {
  it('uploads the build to the branch key, not to a URL', async () => {
    await uploadPreview();

    expect(uploadLocalDirectory).toHaveBeenCalledTimes(1);
    const [dirPath, bucketPath] = uploadLocalDirectory.mock
      .calls[0] as unknown as [string, string];

    // The configured outDir carries a trailing slash, so normalise before comparing.
    expect(dirPath.replace(/\/$/, '')).toBe(path.join(projectDir, 'dist'));
    expect(bucketPath).toBe(`${ROOT}feature-new-chart/`);
    // An S3 key, never the fully specified URL.
    expect(bucketPath).not.toContain('://');
  });

  it('records the branch URL in package.json', async () => {
    await uploadPreview();

    expect(PKG.preview.branch('feature-new-chart').url).toBe(
      `${PREVIEW_ORIGIN}/${ROOT}feature-new-chart/`
    );
    expect(PKG.preview.root).toBe(ROOT);
  });

  /**
   * The ordering `uploadPreview` documents. `package.json` is the only channel to
   * the spawned build — page builders call `getBasePath('preview')` from their own
   * config — so the URL has to be written before the build starts. Reorder them
   * and the build bakes in a wrong base path, silently.
   */
  it('writes the preview URL before the build runs', async () => {
    await uploadPreview();

    expect(previewSeenByBuild).toEqual({
      root: ROOT,
      branches: {
        'feature-new-chart': `${PREVIEW_ORIGIN}/${ROOT}feature-new-chart/`,
      },
    });
  });

  it('publishes a different branch to a different key under the same root', async () => {
    await uploadPreview();

    process.env.PUBLISHER_PREVIEW_BRANCH = 'main';
    resetBranchCache();
    await uploadPreview();

    const keys = uploadLocalDirectory.mock.calls.map(
      (call) => (call as unknown as [string, string])[1]
    );
    expect(keys).toEqual([`${ROOT}feature-new-chart/`, `${ROOT}main/`]);
    // Both recorded, neither overwriting the other.
    expect(Object.keys(PKG.preview.branches).sort()).toEqual([
      'feature-new-chart',
      'main',
    ]);
  });
});
