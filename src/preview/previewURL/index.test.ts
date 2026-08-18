import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { setProject } from '../../__test__/project';

import { getPreviewURL } from '.';
import { utils } from '@reuters-graphics/graphics-bin';
import { PKG } from '../../pkg';
import { resetBranchCache } from '../../git/branch';
import { PREVIEW_ORIGIN } from '../../constants/preview';
import { PackageConfigError } from '../../exceptions/errors';

const ROOT = 'testfiles/2025/ab12cd34ef56/';

/**
 * Pin the branch through the env override so these tests don't depend on the
 * repo's actual checked-out branch — or on the temp project being a git repo.
 */
const onBranch = (branch: string) => {
  process.env.PUBLISHER_PREVIEW_BRANCH = branch;
  resetBranchCache();
};

const CI_ENV_VARS = ['CI', 'GITHUB_ACTIONS', 'VERCEL'] as const;
const TEST_ENV_VARS = ['VITEST', 'TESTING'] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const envVar of [
    'PUBLISHER_PREVIEW_BRANCH',
    'GITHUB_HEAD_REF',
    'GITHUB_REF_NAME',
    ...CI_ENV_VARS,
    ...TEST_ENV_VARS,
    'NODE_ENV',
  ]) {
    saved[envVar] = process.env[envVar];
    if (envVar !== 'VITEST' && envVar !== 'NODE_ENV')
      delete process.env[envVar];
  }
  setProject({
    'package.json': JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      reuters: {},
    }),
  });
  onBranch('main');
});

afterEach(() => {
  for (const [envVar, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[envVar];
    else process.env[envVar] = value;
  }
  resetBranchCache();
});

describe('getPreviewURL', () => {
  it('mints a root and a branch entry on a fresh project', () => {
    const { url, bucketPath, slug } = getPreviewURL();

    expect(slug).toBe('main');
    expect(bucketPath).toMatch(
      new RegExp(`^testfiles/${new Date().getFullYear()}/[A-Za-z0-9]+/main/$`)
    );
    expect(url).toBe(`${PREVIEW_ORIGIN}/${bucketPath}`);

    // Root is persisted as a key — no scheme, no host.
    expect(PKG.preview.root).toBe(bucketPath.replace(/main\/$/, ''));
    expect(PKG.preview.root).not.toContain('://');
    // The branch entry is the openable URL.
    expect(PKG.preview.branch('main').url).toBe(url);
  });

  it('returns the existing entry for a branch already previewed', () => {
    utils.setPkgProp('reuters.preview', {
      root: ROOT,
      branches: { main: `${PREVIEW_ORIGIN}/${ROOT}main/` },
    });

    const { url } = getPreviewURL();

    expect(url).toBe(`${PREVIEW_ORIGIN}/${ROOT}main/`);
    // Untouched — no churn in package.json when nothing changed.
    expect(PKG.preview.branches).toEqual({
      main: `${PREVIEW_ORIGIN}/${ROOT}main/`,
    });
  });

  /**
   * The point of storing the root: a new branch inherits the year and hash rather
   * than minting its own, so every branch of a project resolves under one prefix.
   */
  it('reuses the stored root for a new branch, inheriting its year and hash', () => {
    utils.setPkgProp('reuters.preview', {
      root: ROOT,
      branches: { main: `${PREVIEW_ORIGIN}/${ROOT}main/` },
    });

    onBranch('feature/new-chart');
    const { url, bucketPath, slug } = getPreviewURL();

    expect(slug).toBe('feature-new-chart');
    expect(bucketPath).toBe(`${ROOT}feature-new-chart/`);
    expect(url).toBe(`${PREVIEW_ORIGIN}/${ROOT}feature-new-chart/`);
    // 2025's root survived, even though it isn't the current year.
    expect(PKG.preview.root).toBe(ROOT);
    expect(Object.keys(PKG.preview.branches).sort()).toEqual([
      'feature-new-chart',
      'main',
    ]);
  });

  /**
   * The regression `root` outliving a publish exists to prevent: after cleanup
   * empties `branches`, the next previews must land under the same root rather
   * than each minting a new one.
   */
  it('reuses the root after a publish emptied branches', () => {
    utils.setPkgProp('reuters.preview', { root: ROOT, branches: {} });

    onBranch('feat-a');
    const a = getPreviewURL();
    onBranch('feat-b');
    const b = getPreviewURL();

    expect(a.bucketPath).toBe(`${ROOT}feat-a/`);
    expect(b.bucketPath).toBe(`${ROOT}feat-b/`);
    expect(PKG.preview.root).toBe(ROOT);
  });

  it('publishes to the shared fallback slug when there is no branch', () => {
    utils.setPkgProp('reuters.preview', { root: ROOT, branches: {} });
    // No env override and the temp project isn't a git repo.
    delete process.env.PUBLISHER_PREVIEW_BRANCH;
    resetBranchCache();

    const { slug, bucketPath } = getPreviewURL();

    expect(slug).toBe('_');
    expect(bucketPath).toBe(`${ROOT}_/`);
  });

  describe('legacy string migration', () => {
    it('rewrites a legacy URL string into { root, branches }', () => {
      utils.setPkgProp('reuters.preview', `${PREVIEW_ORIGIN}/${ROOT}`);

      const { url, bucketPath } = getPreviewURL();

      // The legacy URL became the root, so the hash and year carry over.
      expect(PKG.preview.root).toBe(ROOT);
      expect(bucketPath).toBe(`${ROOT}main/`);
      expect(PKG.preview.branch('main').url).toBe(url);
    });

    it('migrates a legacy value written against a different origin', () => {
      // A naive `replace(PREVIEW_ORIGIN + '/', '')` would leave this intact and
      // then compose `{ORIGIN}/https://…`.
      utils.setPkgProp('reuters.preview', `https://www.reuters.com/${ROOT}`);

      const { url } = getPreviewURL();

      expect(PKG.preview.root).toBe(ROOT);
      expect(url).toBe(`${PREVIEW_ORIGIN}/${ROOT}main/`);
      expect(url).not.toContain('https://https://');
    });

    it('adds a missing trailing slash, so the slug cannot splice into the root', () => {
      utils.setPkgProp(
        'reuters.preview',
        `${PREVIEW_ORIGIN}/testfiles/2025/ab12cd34ef56`
      );

      const { bucketPath } = getPreviewURL();

      expect(bucketPath).toBe(`${ROOT}main/`);
    });

    it('re-mints when a legacy value is unparseable', () => {
      utils.setPkgProp('reuters.preview', 'not-a-url');

      const { bucketPath } = getPreviewURL();

      expect(bucketPath).toMatch(
        new RegExp(`^testfiles/${new Date().getFullYear()}/[A-Za-z0-9]+/main/$`)
      );
      expect(PKG.preview.root).not.toContain('not-a-url');
    });
  });

  describe('in CI', () => {
    /**
     * `isTestingEnvironment` normally exempts the suite from CI guards, so these
     * two cases have to look like a genuine CI run: CI markers on, test markers
     * off. Restored in `afterEach`.
     */
    const asRealCi = () => {
      process.env.GITHUB_ACTIONS = 'true';
      delete process.env.VITEST;
      delete process.env.TESTING;
      delete process.env.NODE_ENV;
    };

    it('refuses to mint a root, since it could never be cleaned up', () => {
      asRealCi();

      expect(() => getPreviewURL()).toThrowError(PackageConfigError);
      expect(PKG.preview.root).toBeUndefined();
    });

    it('is happy once a root has been committed', () => {
      utils.setPkgProp('reuters.preview', { root: ROOT, branches: {} });
      asRealCi();

      const { bucketPath } = getPreviewURL();

      expect(bucketPath).toBe(`${ROOT}main/`);
    });

    /**
     * A GitHub Actions `pull_request` run: detached HEAD, `GITHUB_REF_NAME` is the
     * PR number, and only `GITHUB_HEAD_REF` carries the branch.
     */
    it('uses the PR head branch, not the merge ref', () => {
      utils.setPkgProp('reuters.preview', { root: ROOT, branches: {} });
      delete process.env.PUBLISHER_PREVIEW_BRANCH;
      process.env.GITHUB_HEAD_REF = 'feat/new-chart';
      process.env.GITHUB_REF_NAME = '123/merge';
      resetBranchCache();

      const { slug, bucketPath } = getPreviewURL();

      expect(slug).toBe('feat-new-chart');
      expect(bucketPath).toBe(`${ROOT}feat-new-chart/`);
    });
  });
});
