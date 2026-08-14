import { BRANCH_DIR, PREVIEW_ORIGIN } from '../../constants/preview';
import cryptoRandomString from 'crypto-random-string';
import urljoin from 'url-join';
import { PKG } from '../../pkg';
import { getPreviewBranchSlug } from '../branch';

/**
 * Gets the project's preview root from package.json. Sets a random one if it
 * hasn't been set yet.
 *
 * This is the value branch previews hang beneath, and the only preview URL ever
 * written to package.json — see {@link getPreviewURL}.
 */
export const getPreviewRoot = () => {
  const preview = PKG.preview;
  // Normalised to a directory URL. The publisher always writes one with a
  // trailing slash, but package.json is hand-editable, and everything
  // downstream — the S3 key prefix, the base path handed to the build, the
  // branch segment joined onto it — treats this as a directory.
  if (preview) return preview.endsWith('/') ? preview : `${preview}/`;
  const hash = cryptoRandomString({ length: 12, type: 'url-safe' }).replace(
    /[^A-Za-z0-9]/g,
    ''
  );
  const url = `${PREVIEW_ORIGIN}/testfiles/${new Date().getFullYear()}/${hash}/`;
  PKG.preview = url;
  return url;
};

/**
 * Gets the URL this preview should publish to: the project's preview root, plus
 * a subdirectory for the current branch.
 *
 * The branch part is deliberately *not* saved to package.json. It's derived
 * afresh each run, so package.json holds one stable URL that every branch
 * agrees on. Writing the branch URL there instead would put a different value
 * in the one file every branch touches — a standing merge conflict — and would
 * leave the working tree dirty after a preview, which some projects treat as a
 * signal that there's publish metadata to commit.
 *
 * @param branch An explicit branch name, or `false` to publish to the root
 * @returns The preview URL, with a trailing slash
 */
export const getPreviewURL = (branch?: string | false) => {
  const root = getPreviewRoot();
  const slug = getPreviewBranchSlug(branch);
  if (!slug) return root;
  // urljoin normalises the root's trailing slash for us; we add our own back
  // because the rest of the preview flow (and the S3 path derived from it)
  // expects a directory URL.
  return `${urljoin(root, BRANCH_DIR, slug)}/`;
};
