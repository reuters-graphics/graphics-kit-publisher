import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import slugify from 'slugify';
import { context } from '../../context';

/**
 * Names the branch a preview belongs to, for the cases the publisher can't work
 * it out itself — a release pipeline that checks out a tag, say, or a local run
 * you want to land somewhere specific. The `--branch` flag beats it.
 */
export const PREVIEW_BRANCH_ENV_VAR = 'PUBLISHER_PREVIEW_BRANCH';

/**
 * Cap on the branch segment. Long enough for the branch names people actually
 * write, short enough that the preview URL stays something you can paste into a
 * message without it wrapping.
 */
const MAX_SLUG_LENGTH = 48;

/** A short digest, used to keep truncated slugs distinct from one another. */
const shortHash = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex').slice(0, 7);

/** Run a git command in the project, returning '' rather than throwing. */
const runGit = (args: string[]) => {
  try {
    return execFileSync('git', args, {
      cwd: context.cwd,
      encoding: 'utf8',
      // stderr ignored: a project outside a repo, or a machine without git, is
      // a perfectly ordinary thing to hit here and shouldn't print noise.
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
};

/**
 * The current branch according to git.
 *
 * `--abbrev-ref HEAD` answers the literal string `HEAD` on a detached checkout,
 * which is exactly what CI runners hand us — `actions/checkout` detaches by
 * default. That's useless as a directory name and would put every CI build in a
 * shared `head/`, so fall back to the commit, which at least stays distinct.
 */
const gitBranch = () => {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (branch && branch !== 'HEAD') return branch;
  return runGit(['rev-parse', '--short', 'HEAD']);
};

/**
 * Work out which branch this preview belongs to.
 *
 * Environment before git, deliberately. Under `actions/checkout` the working
 * copy is a detached HEAD, so git alone can't name the branch in the one place
 * branch previews matter most.
 *
 * `GITHUB_HEAD_REF` comes before `GITHUB_REF_NAME` for the same reason: on a
 * `pull_request` event `GITHUB_REF_NAME` is the merge ref — `395/merge` — while
 * `GITHUB_HEAD_REF` is the branch the author pushed and would recognise.
 *
 * @param override An explicit branch name, e.g. from `--branch`
 * @returns The branch name, or `undefined` if nothing could name it
 */
export const resolveBranch = (override?: string): string | undefined => {
  const candidates = [
    override,
    process.env[PREVIEW_BRANCH_ENV_VAR],
    process.env.GITHUB_HEAD_REF,
    process.env.GITHUB_REF_NAME,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return gitBranch() || undefined;
};

/**
 * Turn a branch name into one URL path segment.
 *
 * `slugify` on its own drops `/` rather than replacing it, which would run the
 * parts of a branch name together — `feat/my-thing` becoming `featmy-thing` —
 * so the separators become spaces first, which it does turn into dashes. Going
 * through `slugify` rather than a bare regex keeps its transliteration, so
 * `feat/über-chart` reads as `feat-uber-chart` instead of losing the word.
 *
 * **Note:** the slug is lossy, so two branches can collide — `feat/a-b` and
 * `feat-a-b` both give `feat-a-b` and would share a preview. Deliberate: the
 * alternative is hashing every slug, which buys uniqueness nobody has needed at
 * the cost of URLs nobody can read.
 *
 * @param branch Branch name
 * @returns A URL-safe path segment
 */
export const slugifyBranch = (branch: string) => {
  const slug = slugify(branch.replace(/[/_.\\]+/g, ' '), {
    lower: true,
    strict: true,
  });
  // Nothing survived — a branch of only punctuation, say. A hash is unlovely
  // but it's a valid directory, which is what the caller needs.
  if (!slug) return shortHash(branch);
  if (slug.length <= MAX_SLUG_LENGTH) return slug;
  // Truncation alone would collide across long branches sharing a prefix, which
  // is the normal shape of them (`feat/really-long-thing-{one,two}`).
  return `${slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '')}-${shortHash(branch)}`;
};

/**
 * The path segment this preview should live under, or `undefined` when it
 * belongs at the preview root.
 *
 * @param override An explicit branch name, or `false` to force the root
 * @returns A URL path segment, or `undefined` for the root
 */
export const getPreviewBranchSlug = (override?: string | false) => {
  const { perBranch, rootBranches } = context.config.preview;
  if (perBranch === false || override === false) return undefined;
  const branch = resolveBranch(override);
  if (!branch) return undefined;
  // Matched on the branch name rather than its slug, so what you write in the
  // config is the branch you'd type at a terminal.
  const isRootBranch = rootBranches.some(
    (rootBranch) => rootBranch.toLowerCase() === branch.toLowerCase()
  );
  if (isRootBranch) return undefined;
  return slugifyBranch(branch);
};
