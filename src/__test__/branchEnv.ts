import { beforeEach, afterEach } from 'vitest';

/** Everything that can name a branch to {@link resolveBranch}. */
const BRANCH_ENV_VARS = [
  'PUBLISHER_PREVIEW_BRANCH',
  'GITHUB_HEAD_REF',
  'GITHUB_REF_NAME',
] as const;

/**
 * Clear the environment variables that name a branch, around every test in the
 * calling file.
 *
 * Without this, a test about where previews land passes on a laptop and fails in
 * CI. GitHub Actions sets `GITHUB_REF_NAME` on every step, and `GITHUB_HEAD_REF`
 * on pull requests, so the code under test would read the branch *this repo's
 * own CI* happens to be running on — which is both wrong and different on every
 * run.
 *
 * Saves and restores rather than just deleting, so a test file using this
 * doesn't strip the environment out from under any that follow it.
 */
export const isolateBranchEnv = () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const key of BRANCH_ENV_VARS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });
  afterEach(() => {
    for (const key of BRANCH_ENV_VARS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });
};
