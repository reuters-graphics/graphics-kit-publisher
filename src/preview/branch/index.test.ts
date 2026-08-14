import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { setProject } from '../../__test__/project';
import { isolateBranchEnv } from '../../__test__/branchEnv';
import { context } from '../../context';

import {
  getPreviewBranchSlug,
  resolveBranch,
  slugifyBranch,
  PREVIEW_BRANCH_ENV_VAR,
} from '.';

isolateBranchEnv();

describe('slugifyBranch', () => {
  it('turns a branch path into one readable segment', () => {
    // The plain slugify() this wraps drops "/" rather than replacing it, which
    // would run the words together as "featembed-feels-like-toggle".
    expect(slugifyBranch('feat/embed-feels-like-toggle')).toBe(
      'feat-embed-feels-like-toggle'
    );
  });

  it('lowercases and normalises the separators people actually use', () => {
    expect(slugifyBranch('fix/BUG-123_thing')).toBe('fix-bug-123-thing');
    expect(slugifyBranch('release/v2.1.0')).toBe('release-v2-1-0');
    expect(slugifyBranch('user/ben.welsh/spike')).toBe('user-ben-welsh-spike');
  });

  it('transliterates rather than dropping non-ASCII words', () => {
    expect(slugifyBranch('feat/über-chart')).toBe('feat-uber-chart');
  });

  it('collapses repeated separators instead of leaving empty segments', () => {
    expect(slugifyBranch('feat//double')).toBe('feat-double');
    expect(slugifyBranch('/leading/and/trailing/')).toBe(
      'leading-and-trailing'
    );
  });

  it('still returns a usable segment when nothing survives slugifying', () => {
    const slug = slugifyBranch('---');
    expect(slug).not.toBe('');
    expect(slug).toMatch(/^[a-f0-9]{7}$/);
  });

  it('caps length, and keeps long branches sharing a prefix distinct', () => {
    // Truncation alone would collide here — which is the normal shape of long
    // branch names, not an exotic case.
    const one = slugifyBranch(
      'feat/a-really-quite-long-branch-name-that-goes-on/variant-one'
    );
    const two = slugifyBranch(
      'feat/a-really-quite-long-branch-name-that-goes-on/variant-two'
    );
    expect(one.length).toBeLessThanOrEqual(56); // 48 + '-' + 7-char hash
    expect(one).not.toBe(two);
  });

  it('never leaves a trailing dash before the hash', () => {
    // The cap can land mid-separator, which would read as "...on--a1b2c3d".
    const slug = slugifyBranch(
      'feat/exactly-forty-eight-characters-before-a/break'
    );
    expect(slug).not.toContain('--');
  });
});

describe('resolveBranch', () => {
  it('prefers an explicit override over everything else', () => {
    process.env.GITHUB_HEAD_REF = 'from-head-ref';
    expect(resolveBranch('explicit')).toEqual({
      name: 'explicit',
      fromPullRequestHead: false,
    });
  });

  it('reads the override env var when there is no argument', () => {
    process.env[PREVIEW_BRANCH_ENV_VAR] = 'from-env';
    process.env.GITHUB_HEAD_REF = 'from-head-ref';
    expect(resolveBranch()?.name).toBe('from-env');
  });

  it('prefers GITHUB_HEAD_REF over GITHUB_REF_NAME, and marks it as a PR head', () => {
    // On a pull_request event GITHUB_REF_NAME is the merge ref — "395/merge" —
    // while GITHUB_HEAD_REF is the branch the author would recognise.
    process.env.GITHUB_HEAD_REF = 'feat/the-real-branch';
    process.env.GITHUB_REF_NAME = '395/merge';
    expect(resolveBranch()).toEqual({
      name: 'feat/the-real-branch',
      fromPullRequestHead: true,
    });
  });

  it('falls back to GITHUB_REF_NAME on a push, where there is no head ref', () => {
    process.env.GITHUB_REF_NAME = 'main';
    expect(resolveBranch()).toEqual({
      name: 'main',
      fromPullRequestHead: false,
    });
  });

  it('ignores blank values rather than treating them as a branch', () => {
    // GitHub sets GITHUB_HEAD_REF to an empty string on non-PR events.
    process.env.GITHUB_HEAD_REF = '';
    process.env.GITHUB_REF_NAME = 'main';
    expect(resolveBranch()?.name).toBe('main');
  });
});

describe('getPreviewBranchSlug', () => {
  const originalPreview = context.config.preview;

  beforeEach(() => {
    setProject({ 'package.json': JSON.stringify({ reuters: {} }) });
    context.config.preview = { ...originalPreview };
  });

  afterEach(() => {
    context.config.preview = originalPreview;
  });

  it('returns the slug for an ordinary branch', () => {
    process.env.GITHUB_HEAD_REF = 'feat/new-map';
    expect(getPreviewBranchSlug()).toBe('feat-new-map');
  });

  it('returns nothing for a root branch, so the canonical URL keeps working', () => {
    process.env.GITHUB_REF_NAME = 'main';
    expect(getPreviewBranchSlug()).toBeUndefined();
  });

  it('matches root branches case-insensitively', () => {
    process.env.GITHUB_REF_NAME = 'MAIN';
    expect(getPreviewBranchSlug()).toBeUndefined();
  });

  it('matches root branches on the name, not the slug', () => {
    // 'release/v1' slugs to 'release-v1'; configuring the branch name should be
    // what works, since that's what you'd type at a terminal.
    context.config.preview.rootBranches = ['release/v1'];
    process.env.GITHUB_REF_NAME = 'release/v1';
    expect(getPreviewBranchSlug()).toBeUndefined();
  });

  it('returns nothing when the caller forces the root', () => {
    process.env.GITHUB_HEAD_REF = 'feat/new-map';
    expect(getPreviewBranchSlug(false)).toBeUndefined();
  });

  it('returns nothing when per-branch previews are switched off', () => {
    context.config.preview.perBranch = false;
    process.env.GITHUB_REF_NAME = 'feat/new-map';
    expect(getPreviewBranchSlug()).toBeUndefined();
  });

  it('honours an explicit branch over the environment', () => {
    process.env.GITHUB_HEAD_REF = 'feat/from-the-environment';
    expect(getPreviewBranchSlug('feat/explicit')).toBe('feat-explicit');
  });

  it('honours an explicit branch even when per-branch previews are off', () => {
    // Ignoring the flag here wouldn't just do nothing — it would send the build
    // to the shared root, on top of whatever is being reviewed there.
    context.config.preview.perBranch = false;
    expect(getPreviewBranchSlug('spike')).toBe('spike');
  });

  it('still lets an explicit --no-branch win over an explicit branch name', () => {
    expect(getPreviewBranchSlug(false)).toBeUndefined();
  });

  describe('pull request head refs', () => {
    it('never treats a head ref as a root branch, whatever it is called', () => {
      // A head ref is named by whoever opened the pull request, and "main" is
      // the default for anyone working on a fork without branching. Letting it
      // claim the exemption would publish an outside contributor's build over
      // the canonical preview wherever credentials reach pull requests.
      process.env.GITHUB_HEAD_REF = 'main';
      process.env.GITHUB_REF_NAME = '395/merge';

      expect(getPreviewBranchSlug()).toBe('main');
    });

    it('also isolates a head ref named master', () => {
      process.env.GITHUB_HEAD_REF = 'master';
      expect(getPreviewBranchSlug()).toBe('master');
    });

    it('still lets a real push to main use the root', () => {
      // The same name, arriving the way GitHub reports a push, is canonical.
      process.env.GITHUB_REF_NAME = 'main';
      expect(getPreviewBranchSlug()).toBeUndefined();
    });
  });
});
