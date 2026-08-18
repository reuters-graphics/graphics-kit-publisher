import { execFileSync } from 'node:child_process';
import slugify from 'slugify';
import {
  FALLBACK_BRANCH_SLUG,
  PREVIEW_BRANCH_ENV_VAR,
} from '../constants/preview';

/**
 * Resolving the current git branch, so previews can be published per branch.
 *
 * Deliberately depends on nothing else in `src/` except constants: both the
 * publisher and `getBasePath` (`src/basePaths.ts`) call it, and `getBasePath`
 * runs inside the project's own build config, so a heavier dependency here would
 * be paid for on every build.
 */

/**
 * Longest slug we'll put in a URL path segment. Branch names have no practical
 * limit and some conventions are very long (`feature/JIRA-1234-a-whole-sentence`).
 */
const MAX_SLUG_LENGTH = 60;

/**
 * Environment variables that name the current branch, in precedence order.
 *
 * **The order is load-bearing on GitHub Actions `pull_request` runs**, where two
 * of the three sources are wrong:
 *
 * | Source          | `pull_request`      | `push`            |
 * | --------------- | ------------------- | ----------------- |
 * | GITHUB_HEAD_REF | `feat/new-chart` ✅ | unset             |
 * | GITHUB_REF_NAME | `123/merge` ❌      | `feat/new-chart` ✅ |
 * | `git rev-parse` | `HEAD`, detached ❌ | branch ✅         |
 *
 * `actions/checkout` checks out the PR's *merge ref* in detached HEAD state, and
 * `GITHUB_REF_NAME` is the pull request number, not the branch. Only
 * `GITHUB_HEAD_REF` carries the source branch — so if these are reordered, PR
 * previews silently publish to `123-merge`: plausible-looking, meaningless, and
 * different for every pull request. Don't reorder them.
 */
const BRANCH_ENV_VARS = [
  PREVIEW_BRANCH_ENV_VAR,
  'GITHUB_HEAD_REF',
  'GITHUB_REF_NAME',
] as const;

/**
 * Cached result of the git subprocess — `undefined` means "not asked yet",
 * `null` means "asked, and there's no branch".
 *
 * Only the subprocess is cached. Environment variables are read fresh every
 * time, since they're free and reading them first means the common CI paths
 * never shell out at all.
 */
let cachedGitBranch: string | null | undefined;

/** Reset the git subprocess cache. Exported for tests. */
export const resetBranchCache = () => {
  cachedGitBranch = undefined;
};

/**
 * Ask git for the checked-out branch.
 *
 * Returns `undefined` for a detached HEAD — `git rev-parse --abbrev-ref HEAD`
 * answers with the literal string `HEAD`, which is a state, not a branch named
 * "HEAD" — and for anything that throws: not a git repo, git not installed, git
 * erroring for its own reasons.
 */
const gitBranch = () => {
  if (cachedGitBranch !== undefined) return cachedGitBranch ?? undefined;
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      // git's own stderr is noise here ("fatal: not a git repository"): the
      // absence of a branch is an expected outcome we handle, not an error to
      // show. stdin is ignored so git can never block waiting on input.
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    cachedGitBranch = branch && branch !== 'HEAD' ? branch : null;
  } catch {
    cachedGitBranch = null;
  }
  return cachedGitBranch ?? undefined;
};

/**
 * The current branch name, unslugified, or `undefined` if there isn't one.
 *
 * @see {@link BRANCH_ENV_VARS} for why the environment is consulted before git.
 */
export const currentBranch = (): string | undefined => {
  for (const envVar of BRANCH_ENV_VARS) {
    const value = process.env[envVar]?.trim();
    if (value) return value;
  }
  return gitBranch();
};

/**
 * Turn a branch name into a URL- and S3-safe path segment.
 *
 * Separators are replaced *before* slugifying because `slugify(…, {strict:
 * true})` would otherwise delete them outright — `feature/new-chart` becomes
 * `featurenew-chart`, which reads badly and collides more (`feat/ure` and
 * `featu/re` would both land on it).
 *
 * Two properties this guarantees, both relied on elsewhere:
 *
 * 1. **A slug never begins with `_`**, which is what makes
 *    {@link FALLBACK_BRANCH_SLUG} impossible to collide with.
 * 2. **A slug never contains a dot**, so it stays a single key when written
 *    through graphics-bin's dot-path setters (`reuters.preview.branches.<slug>`).
 *
 * May return `''` — for a name that is all separators or has no Latin
 * characters (`___`, `...`, `🎉`). Callers get the fallback via
 * {@link currentBranchSlug} rather than handling that themselves.
 *
 * @param branch Branch name, e.g. `feature/new-chart`
 * @returns Slug, e.g. `feature-new-chart`
 */
export const branchSlug = (branch: string): string =>
  slugify(branch.replace(/[/\\_\s]+/g, '-'), { lower: true, strict: true })
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    // Again, because the slice above can leave one behind.
    .replace(/-+$/, '');

/**
 * The slug for the current branch's preview, always resolving to something
 * usable.
 *
 * Falls back to {@link FALLBACK_BRANCH_SLUG} when there's no branch or the name
 * slugifies to nothing. Returns a plain `string` rather than
 * `string | undefined` so the fallback lives here instead of at every call site.
 *
 * Silent by design: this is called on reads too (`getBasePath` during a build),
 * and only the code that *writes* a preview entry should warn about landing on
 * the shared fallback. Compare against {@link FALLBACK_BRANCH_SLUG} to detect it.
 */
export const currentBranchSlug = (): string => {
  const branch = currentBranch();
  const slug = branch ? branchSlug(branch) : '';
  return slug || FALLBACK_BRANCH_SLUG;
};
