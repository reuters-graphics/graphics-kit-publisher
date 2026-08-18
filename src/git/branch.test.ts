import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';

import { projectDir, resetProject } from '../__test__/project';
import {
  branchSlug,
  currentBranch,
  currentBranchSlug,
  resetBranchCache,
} from './branch';
import { FALLBACK_BRANCH_SLUG } from '../constants/preview';

/**
 * Env vars the module reads. Cleared around every test so a value set by the
 * real environment — CI sets `GITHUB_REF_NAME` on every run of this suite —
 * can't leak in and decide the result.
 */
const BRANCH_ENV_VARS = [
  'PUBLISHER_PREVIEW_BRANCH',
  'GITHUB_HEAD_REF',
  'GITHUB_REF_NAME',
] as const;

const clearBranchEnv = () => {
  for (const envVar of BRANCH_ENV_VARS) delete process.env[envVar];
};

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const envVar of BRANCH_ENV_VARS) saved[envVar] = process.env[envVar];
  clearBranchEnv();
  resetBranchCache();
});

afterEach(() => {
  for (const envVar of BRANCH_ENV_VARS) {
    if (saved[envVar] === undefined) delete process.env[envVar];
    else process.env[envVar] = saved[envVar];
  }
  resetBranchCache();
});

describe('branchSlug', () => {
  it.each([
    ['main', 'main'],
    ['feature/new-chart', 'feature-new-chart'],
    ['fix/JIRA-123_thing', 'fix-jira-123-thing'],
    ['Feature Branch', 'feature-branch'],
    ['UPPER/Case', 'upper-case'],
    ['a//b', 'a-b'],
  ])('slugifies %j to %j', (branch, expected) => {
    expect(branchSlug(branch)).toBe(expected);
  });

  it('caps length', () => {
    expect(branchSlug('a'.repeat(200))).toHaveLength(60);
  });

  it('leaves no trailing dash after the length cap', () => {
    // 60th character lands on a separator, so the naive slice would end in '-'.
    const branch = `${'a'.repeat(59)}/${'b'.repeat(20)}`;
    expect(branchSlug(branch)).not.toMatch(/-$/);
  });

  /**
   * The invariant `FALLBACK_BRANCH_SLUG` rests on. If a branch could ever
   * slugify to something starting with `_`, it could collide with the shared
   * fallback preview and overwrite it.
   */
  describe('never produces a leading underscore', () => {
    it.each([
      '_',
      '__x',
      '_feature/x',
      '_',
      'main',
      'feature/new-chart',
      '__',
      '_-_',
    ])('%j', (branch) => {
      expect(branchSlug(branch)).not.toMatch(/^_/);
    });
  });

  /**
   * The other invariant: no dots, so a slug stays a single key when written
   * through graphics-bin's dot-path setters.
   */
  describe('never produces a dot', () => {
    it.each(['release/v1.2.3', 'dotted.name', '...', 'a.b.c'])(
      '%j',
      (branch) => {
        expect(branchSlug(branch)).not.toContain('.');
      }
    );
  });

  it.each(['___', '...', '🎉', '', '-', '/'])(
    'returns an empty string for %j, which has no usable characters',
    (branch) => {
      expect(branchSlug(branch)).toBe('');
    }
  );
});

describe('currentBranch', () => {
  it('prefers PUBLISHER_PREVIEW_BRANCH over everything', () => {
    process.env.PUBLISHER_PREVIEW_BRANCH = 'chosen';
    process.env.GITHUB_HEAD_REF = 'head-ref';
    process.env.GITHUB_REF_NAME = 'ref-name';
    expect(currentBranch()).toBe('chosen');
  });

  /**
   * The GitHub Actions `pull_request` shape: `actions/checkout` leaves a
   * detached HEAD and `GITHUB_REF_NAME` is the PR number, so `GITHUB_HEAD_REF`
   * is the only source carrying the real branch. If this ordering regresses, PR
   * previews publish to `123-merge` instead — silently, and differently per PR.
   */
  it('prefers GITHUB_HEAD_REF over GITHUB_REF_NAME, as a pull_request run needs', () => {
    process.env.GITHUB_HEAD_REF = 'feat/new-chart';
    process.env.GITHUB_REF_NAME = '123/merge';
    expect(currentBranch()).toBe('feat/new-chart');
    expect(currentBranchSlug()).toBe('feat-new-chart');
  });

  it('falls back to GITHUB_REF_NAME, as a push run needs', () => {
    process.env.GITHUB_REF_NAME = 'feat/new-chart';
    expect(currentBranch()).toBe('feat/new-chart');
  });

  it('ignores env vars set to an empty string, which is how Actions unsets them', () => {
    process.env.GITHUB_HEAD_REF = '';
    process.env.GITHUB_REF_NAME = 'feat/from-push';
    expect(currentBranch()).toBe('feat/from-push');
  });

  it('trims whitespace', () => {
    process.env.PUBLISHER_PREVIEW_BRANCH = '  spaced  ';
    expect(currentBranch()).toBe('spaced');
  });
});

/**
 * The git subprocess against real repositories in the temp project, rather than
 * a mock — the whole point is what git actually prints for these states.
 */
describe('currentBranch, from git', () => {
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: projectDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

  const initRepo = () => {
    git('init', '--initial-branch=main');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    git('commit', '--allow-empty', '-m', 'first');
  };

  beforeEach(() => {
    resetProject();
    resetBranchCache();
  });

  it('reads the checked-out branch', () => {
    initRepo();
    expect(currentBranch()).toBe('main');
    expect(currentBranchSlug()).toBe('main');
  });

  it('reads a slash-containing branch', () => {
    initRepo();
    git('switch', '-c', 'feature/new-chart');
    expect(currentBranch()).toBe('feature/new-chart');
    expect(currentBranchSlug()).toBe('feature-new-chart');
  });

  it('treats a detached HEAD as no branch, not a branch called HEAD', () => {
    initRepo();
    git('checkout', '--detach');
    expect(currentBranch()).toBeUndefined();
    expect(currentBranchSlug()).toBe(FALLBACK_BRANCH_SLUG);
  });

  it('treats a non-repo directory as no branch', () => {
    // resetProject left an empty directory with no `git init`.
    expect(currentBranch()).toBeUndefined();
    expect(currentBranchSlug()).toBe(FALLBACK_BRANCH_SLUG);
  });

  it('caches the subprocess result', () => {
    initRepo();
    expect(currentBranch()).toBe('main');
    git('switch', '-c', 'other');
    // Still the cached answer, because the subprocess isn't re-run.
    expect(currentBranch()).toBe('main');
    resetBranchCache();
    expect(currentBranch()).toBe('other');
  });

  it('does not cache env vars, so they stay live', () => {
    initRepo();
    expect(currentBranch()).toBe('main');
    process.env.PUBLISHER_PREVIEW_BRANCH = 'override';
    expect(currentBranch()).toBe('override');
  });
});

describe('currentBranchSlug', () => {
  it('falls back for a branch whose name slugifies to nothing', () => {
    process.env.PUBLISHER_PREVIEW_BRANCH = '🎉';
    expect(currentBranchSlug()).toBe(FALLBACK_BRANCH_SLUG);
  });

  it('always returns something usable as a path segment', () => {
    for (const branch of ['main', '🎉', '___', 'feature/x']) {
      process.env.PUBLISHER_PREVIEW_BRANCH = branch;
      const slug = currentBranchSlug();
      expect(slug).not.toBe('');
      expect(slug).not.toContain('/');
    }
  });
});
