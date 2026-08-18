import cryptoRandomString from 'crypto-random-string';
import { log } from '@clack/prompts';
import picocolors from 'picocolors';
import { utils } from '@reuters-graphics/graphics-bin';

import {
  FALLBACK_BRANCH_SLUG,
  PREVIEW_BRANCH_ENV_VAR,
  PREVIEW_ORIGIN,
} from '../../constants/preview';
import { PKG } from '../../pkg';
import { currentBranchSlug } from '../../git/branch';
import { PackageConfigError } from '../../exceptions/errors';

interface PreviewLocation {
  /** Fully specified URL for this branch's preview — the openable page. */
  url: string;
  /** S3 key prefix to upload this branch's build to, e.g. `testfiles/2026/ab12/main/`. */
  bucketPath: string;
  /** Branch slug the preview is published under. */
  slug: string;
}

/** A fresh preview root: `testfiles/{year}/{hash}/`. */
const mintRoot = () => {
  const hash = cryptoRandomString({ length: 12, type: 'url-safe' }).replace(
    /[^A-Za-z0-9]/g,
    ''
  );
  return `testfiles/${new Date().getFullYear()}/${hash}/`;
};

/**
 * The project's preview root, minting one the first time.
 *
 * Minted **once, ever**: it's kept in `package.json` across publishes so every
 * branch resolves under the same prefix, which is what stops two branches
 * previewing in parallel from each inventing their own root.
 *
 * Refuses to mint in CI. There, `package.json` lives on a runner that's thrown
 * away, so a minted root is recorded nowhere — no later `publish` could find the
 * prefix to delete, and the uploaded files would orphan permanently. Every other
 * failure in this flow is recoverable; this one isn't, so it's a hard stop.
 * (Testing environments are exempt via the usual `isTestingEnvironment` escape,
 * since a test uploads nothing.)
 */
const getOrMintRoot = () => {
  const existing = PKG.preview.root;
  if (existing) return existing;

  if (
    utils.environment.isCiEnvironment() &&
    !utils.environment.isTestingEnvironment()
  ) {
    throw new PackageConfigError('No preview root in package.json.', {
      code: 'NO_PREVIEW_ROOT_IN_CI',
      hint: `Run \`preview\` once locally and commit "reuters.preview.root", then re-run.`,
      context: { dotPath: PKG.dotPaths.preview.root },
    });
  }

  const root = mintRoot();
  PKG.preview.root = root;
  return root;
};

/**
 * Warn that this preview is going to the shared fallback path.
 *
 * Worth being blunt about: the fallback can't collide with a real branch, but
 * everyone whose branch is unresolvable shares it, so they overwrite each other.
 */
const warnFallbackSlug = () => {
  log.warn(
    `Couldn't determine the git branch — publishing to the shared ${picocolors.cyan(
      `"${FALLBACK_BRANCH_SLUG}"`
    )} preview.
Anyone else without a resolvable branch publishes here too and will overwrite it.
Set ${picocolors.cyan(`${PREVIEW_BRANCH_ENV_VAR}=<name>`)} to get your own preview path.`
  );
};

/**
 * Where this branch's preview goes, recording it in `package.json`.
 *
 * One preview per branch: the project's root prefix plus a slug of the current
 * branch. Returns both the URL and the S3 key because callers need each, and
 * both are composed from the stored root — no round-tripping a URL back into a
 * key.
 */
export const getPreviewURL = (): PreviewLocation => {
  const slug = currentBranchSlug();
  if (slug === FALLBACK_BRANCH_SLUG) warnFallbackSlug();

  const root = getOrMintRoot();
  const bucketPath = `${root}${slug}/`;
  const url = `${PREVIEW_ORIGIN}/${bucketPath}`;

  // Only write when it would change something, so re-previewing the same branch
  // doesn't churn package.json.
  if (PKG.preview.branch(slug).url !== url) PKG.preview.branch(slug).url = url;

  return { url, bucketPath, slug };
};
