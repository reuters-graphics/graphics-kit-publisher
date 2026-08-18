import { describe, it, beforeEach, expect, vi } from 'vitest';

/**
 * Mock the S3 client, not the filesystem.
 *
 * `dangerouslyDeleteS3Directory` only short-circuits in a testing environment
 * *after* it has authenticated (via 1Password) and paginated a real
 * `ListObjectsV2` — so left alone, every case here makes live network calls,
 * takes seconds, and fails without credentials. The network is the boundary
 * worth faking; the temp-project filesystem stays real, as everywhere else.
 */
const deleteS3Directory = vi.fn(async (prefix: string) => [
  { Key: `${prefix}index.html` },
]);
const clearCache = vi.fn();

vi.mock('@reuters-graphics/graphics-bin', async () => {
  const actual = await vi.importActual<
    typeof import('@reuters-graphics/graphics-bin')
  >('@reuters-graphics/graphics-bin');
  return {
    ...actual,
    S3Client: class {
      dangerouslyDeleteS3Directory = deleteS3Directory;
      clearCache = clearCache;
    },
  };
});

import { utils } from '@reuters-graphics/graphics-bin';
import { setProject } from '../__test__/project';
import { deleteAllPreviews } from './cleanup';
import { PKG } from '../pkg';
import { PREVIEW_ORIGIN } from '../constants/preview';

const ROOT = 'testfiles/2026/ab12cd34ef56/';
const OTHER_ROOT = 'testfiles/2026/ff99ff99ff99/';

const branchUrl = (root: string, slug: string) =>
  `${PREVIEW_ORIGIN}/${root}${slug}/`;

const setPreview = (preview: unknown) => {
  setProject({
    'package.json': JSON.stringify({ name: 'test-project', reuters: {} }),
  });
  utils.setPkgProp('reuters.preview', preview);
};

/** Prefixes cleanup asked S3 to delete. */
const deletedPrefixes = () => deleteS3Directory.mock.calls.map(([p]) => p);

describe('deleteAllPreviews', () => {
  beforeEach(() => {
    deleteS3Directory.mockClear();
    clearCache.mockClear();
    setProject({
      'package.json': JSON.stringify({ name: 'test-project', reuters: {} }),
    });
  });

  it('does nothing when there is no root', async () => {
    await expect(deleteAllPreviews()).resolves.toEqual([]);
    expect(deleteS3Directory).not.toHaveBeenCalled();
  });

  it('deletes the root prefix and clears branch entries, keeping the root', async () => {
    setPreview({
      root: ROOT,
      branches: {
        main: branchUrl(ROOT, 'main'),
        'feat-x': branchUrl(ROOT, 'feat-x'),
      },
    });

    await deleteAllPreviews();

    // One delete, of the root — not one per branch. The prefix covers them all.
    expect(deletedPrefixes()).toEqual([ROOT]);
    expect(PKG.preview.branches).toEqual({});
    // Kept, so the next preview reuses the same prefix rather than minting one.
    expect(PKG.preview.root).toBe(ROOT);
  });

  /**
   * The regression that matters most. A preview published from CI writes its
   * branch entry to a runner-local `package.json` that's then thrown away, so the
   * repo's `branches` is empty while the objects are still in S3. Cleanup is
   * therefore gated on the root, not on there being recorded branches — gate it
   * the other way and this whole class of preview becomes undeletable.
   */
  it('still deletes when branches is empty, because CI previews are unrecorded', async () => {
    setPreview({ root: ROOT, branches: {} });

    await deleteAllPreviews();

    expect(deletedPrefixes()).toEqual([ROOT]);
  });

  /**
   * Two branches that both previewed before either merged could each have minted
   * a root. Entries outside the recorded root would otherwise orphan forever.
   */
  it('also deletes a divergent root implied by a branch entry', async () => {
    setPreview({
      root: ROOT,
      branches: {
        main: branchUrl(ROOT, 'main'),
        'feat-x': branchUrl(OTHER_ROOT, 'feat-x'),
      },
    });

    await deleteAllPreviews();

    expect(deletedPrefixes().sort()).toEqual([ROOT, OTHER_ROOT].sort());
    expect(PKG.preview.branches).toEqual({});
  });

  it('ignores a branch entry whose implied root is too shallow to be one', async () => {
    setPreview({
      root: ROOT,
      branches: {
        main: branchUrl(ROOT, 'main'),
        odd: `${PREVIEW_ORIGIN}/shallow/`,
      },
    });

    await deleteAllPreviews();

    // graphics-bin refuses anything under 3 levels deep, so a mangled entry is
    // skipped rather than allowed to abort the run.
    expect(deletedPrefixes()).toEqual([ROOT]);
  });

  it('keeps going when one prefix fails', async () => {
    deleteS3Directory.mockImplementationOnce(async () => {
      throw new Error('nope');
    });
    setPreview({
      root: ROOT,
      branches: { 'feat-x': branchUrl(OTHER_ROOT, 'feat-x') },
    });

    await expect(deleteAllPreviews()).resolves.toBeDefined();

    expect(deletedPrefixes()).toHaveLength(2);
    expect(PKG.preview.branches).toEqual({});
  });

  /**
   * The cache records what we believe S3 already holds, and a publish voids that
   * bet. Without this, the next preview skips files that no longer exist and
   * publishes a half-broken page.
   */
  it('clears the upload cache', async () => {
    setPreview({ root: ROOT, branches: { main: branchUrl(ROOT, 'main') } });

    await deleteAllPreviews();

    expect(clearCache).toHaveBeenCalled();
  });

  it('migrates a legacy string rather than crashing on it', async () => {
    setPreview(`${PREVIEW_ORIGIN}/${ROOT}`);

    await deleteAllPreviews();

    // The legacy URL was the root, and it survives as a key.
    expect(deletedPrefixes()).toEqual([ROOT]);
    expect(PKG.preview.root).toBe(ROOT);
    expect(PKG.preview.branches).toEqual({});
  });

  it('is safe to run twice', async () => {
    setPreview({ root: ROOT, branches: { main: branchUrl(ROOT, 'main') } });

    await deleteAllPreviews();
    await expect(deleteAllPreviews()).resolves.toBeDefined();

    expect(deletedPrefixes()).toEqual([ROOT, ROOT]);
    expect(PKG.preview.root).toBe(ROOT);
    expect(PKG.preview.branches).toEqual({});
  });
});
