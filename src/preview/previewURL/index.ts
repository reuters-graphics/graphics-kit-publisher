import { BRANCH_DIR, PREVIEW_ORIGIN } from '../../constants/preview';
import cryptoRandomString from 'crypto-random-string';
import { PKG } from '../../pkg';
import { getPreviewBranchSlug } from '../branch';
import { PackageConfigError } from '../../exceptions/errors';

/**
 * Read `reuters.preview` as a directory URL.
 *
 * Parsed rather than string-patched, because the whole preview flow reads this
 * value two incompatible ways: a browser resolves it as a URL, while the S3 key
 * prefix comes from the serialized string. Anything that lives outside the
 * pathname makes those two disagree — append a slash to
 * `…/project?stage=1` and the upload goes to `project?stage=1/…` while the
 * browser asks for `/project`, so the published objects and the advertised URL
 * address different prefixes entirely.
 *
 * A query or fragment has no meaningful S3-prefix semantics, so this rejects
 * rather than quietly dropping it: the value is hand-edited, and silently
 * publishing somewhere other than what's written in package.json is worse than
 * saying so.
 */
const asDirectoryURL = (preview: string) => {
  let url: URL;
  try {
    url = new URL(preview);
  } catch {
    throw new PackageConfigError(
      `"reuters.preview" in package.json isn't a valid URL: ${preview}`,
      {
        code: 'INVALID_PREVIEW_URL',
        hint: 'Set it to an absolute URL, or remove it and the publisher will make you a new one.',
        context: { preview },
      }
    );
  }
  if (url.search || url.hash) {
    throw new PackageConfigError(
      `"reuters.preview" in package.json can't have a ${url.search ? 'query string' : 'fragment'}: ${preview}`,
      {
        code: 'INVALID_PREVIEW_URL',
        hint: 'The preview URL is also an S3 directory, so it has to be just an origin and a path.',
        context: { preview, search: url.search, hash: url.hash },
      }
    );
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
};

/**
 * Gets the project's preview root from package.json. Sets a random one if it
 * hasn't been set yet.
 *
 * This is the value branch previews hang beneath, and the only preview URL ever
 * written to package.json — see {@link getPreviewURL}.
 */
export const getPreviewRoot = () => {
  const preview = PKG.preview;
  if (preview) return asDirectoryURL(preview).toString();
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
  const slug = getPreviewBranchSlug(branch);
  const root = getPreviewRoot();
  if (!slug) return root;
  // Extended on the pathname rather than joined onto the serialized string, so
  // the segment can only ever land in the part of the URL that becomes the S3
  // prefix. `asDirectoryURL` guarantees the pathname ends in a slash.
  const url = new URL(root);
  url.pathname += `${BRANCH_DIR}/${slug}/`;
  return url.toString();
};
