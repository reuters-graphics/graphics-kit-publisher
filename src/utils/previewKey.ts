/**
 * Reduce a fully specified preview URL to the S3 key prefix it points at.
 *
 * Deliberately parses the URL rather than stripping a known origin with
 * `replace(PREVIEW_ORIGIN + '/', '')`: a value whose origin doesn't match would
 * survive that replace *intact*, and then get re-composed into
 * `https://graphics.thomsonreuters.com/https://…`. Parsing can't produce that,
 * and it handles legacy values written against a different host.
 *
 * Always returns a key ending in `/`, because callers append a path segment to
 * it — a legacy URL saved without its trailing slash would otherwise splice
 * straight into the branch slug.
 *
 * @param url Fully specified URL, e.g. `https://host/testfiles/2025/abc123/`
 * @returns Key prefix, e.g. `testfiles/2025/abc123/`, or `undefined` if `url`
 * isn't parseable
 */
export const previewKeyFromUrl = (url: string): string | undefined => {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const key = pathname.replace(/^\/+/, '');
  if (!key) return undefined;
  return key.endsWith('/') ? key : `${key}/`;
};
