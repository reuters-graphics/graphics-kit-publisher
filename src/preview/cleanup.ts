import { S3Client, utils } from '@reuters-graphics/graphics-bin';
import { log } from '@clack/prompts';
import picocolors from 'picocolors';

import { PKG } from '../pkg';
import { previewKeyFromUrl } from '../utils/previewKey';

/**
 * Every S3 prefix this project's previews might live under.
 *
 * Normally exactly one: the stored root. The extra scan exists because two
 * branches that both previewed before either merged could each have minted a
 * root, leaving a `package.json` where some entries sit outside the recorded one.
 * That's rare and shows up as a merge conflict — but if it happens, the entries
 * pointing elsewhere would be orphaned forever, so they're swept too.
 *
 * `root` is a key and branch values are URLs, so each entry is reduced to a key
 * before comparing.
 */
const collectRoots = (root: string, branches: Record<string, string>) => {
  const roots = new Set([root]);
  for (const url of Object.values(branches)) {
    const key = previewKeyFromUrl(url);
    if (!key || key.startsWith(root)) continue;
    // Drop the branch segment to get the root that entry implies.
    const implied = key.replace(/[^/]+\/$/, '');
    // graphics-bin refuses to delete anything less than 3 levels deep, and so do
    // we: a shallower prefix means a mangled entry, not a preview root.
    if (implied.split('/').length - 1 >= 3) roots.add(implied);
  }
  return [...roots];
};

/**
 * Delete every preview of this project and forget the branch entries, keeping the
 * root.
 *
 * Called after a successful `publish`: the preview URLs people were sharing now
 * point at a published page instead, so the previews have served their purpose.
 *
 * Gated on the **root**, never on there being recorded branches.
 * `dangerouslyDeleteS3Directory` finds what to delete by listing S3, so it removes
 * whatever is actually under the prefix — which is what makes previews published
 * from CI recoverable. A CI run writes its branch entry to a runner-local
 * `package.json` that's then discarded, so this repo never learns about it, but
 * the objects are still under the root and get swept here. Gate on `branches`
 * instead and that whole class of preview becomes undeletable, because the run
 * that could delete them would return early believing there was nothing to do.
 *
 * The cost is one `ListObjectsV2` against an empty prefix when someone publishes
 * twice with no preview in between. It finds nothing and exits. That's cheap
 * enough not to trade for the bug above.
 *
 * @returns The objects deleted, for tests to assert on
 */
export const deleteAllPreviews = async () => {
  const root = PKG.preview.root;
  if (!root) return [];

  const roots = collectRoots(root, PKG.preview.branches);
  if (roots.length > 1) {
    // Worth surfacing: it means the config diverged at some point.
    log.warn(
      `Found previews under ${roots.length} different roots. Cleaning up all of them.`
    );
  }

  const s3 = new S3Client();
  const deleted: { Key: string }[] = [];

  for (const key of roots) {
    try {
      const objects = await s3.dangerouslyDeleteS3Directory(key, true);
      if (objects) deleted.push(...objects);
    } catch (error) {
      // One mangled prefix shouldn't stop the others being cleaned up.
      log.warn(
        `Couldn't clean up previews under ${picocolors.cyan(key)}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Clear the upload cache unconditionally. It's a record of what we believe S3
   * already holds, and a publish voids that bet — but the delete is a no-op in
   * CI, so "did we delete anything" isn't a reliable signal here.
   *
   * The asymmetry decides it: clearing when we didn't need to costs one slower
   * upload, while not clearing when we should have makes the next preview skip
   * files that no longer exist and publish a half-broken page.
   */
  s3.clearCache();
  PKG.preview.clearBranches();

  // In CI graphics-bin's delete is a hard no-op, so don't claim to have cleaned
  // anything up. The files stay put until someone publishes locally.
  if (
    utils.environment.isCiEnvironment() &&
    !utils.environment.isTestingEnvironment()
  ) {
    log.info(
      'Skipped deleting preview files, which only happens outside CI. They will be cleaned up by the next local publish.'
    );
    return deleted;
  }

  if (!utils.environment.isTestingEnvironment()) {
    log.step(
      deleted.length ?
        `🧹 Cleaned up ${deleted.length} preview file${deleted.length === 1 ? '' : 's'}.`
      : '🧹 No preview files to clean up.'
    );
  }

  return deleted;
};
