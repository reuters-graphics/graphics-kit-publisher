import fs from 'fs';
import path from 'path';
import { PLACEHOLDER_TOKEN, PRERENDER_HOST_TOKEN } from '../constants/rewrite';
import { BuildError } from '../exceptions/errors';

/**
 * Rewrites a staged archive from the placeholder base URL it was built against
 * to the archive's own URL, so every archive is self-contained and can be
 * re-uploaded without disturbing the others.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */

/**
 * Extensions we rewrite. Everything else — images, fonts, zips — is copied
 * untouched. An allowlist rather than binary sniffing: predictable, and the set
 * of text formats a page builder emits is small and known.
 *
 * `.map` matters as much as `.js`: sourcemaps embed the base URL too, and a map
 * that disagrees with its source is worse than no map.
 */
const TEXT_EXTENSIONS = new Set([
  '.html',
  '.htm',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
  '.map',
  '.txt',
  '.svg',
  '.webmanifest',
  '.xml',
]);

/**
 * Deliberately not exported, along with the other two interfaces below: nothing
 * outside this module needs to name them yet, and object literals type
 * structurally at the call sites. Export them when a consumer actually does.
 */
interface RewriteMapping {
  from: string;
  to: string;
}

interface RewritePlan {
  /** The base URL the project was built against, e.g. {@link PLACEHOLDER_BASE}. */
  placeholderBase: string;
  /** The archive's own URL, as reserved by the graphics server. */
  archiveUrl: string;
  /**
   * Path of the page that gets hoisted to the archive root, relative to the
   * build output — e.g. `embeds/en/map`. Omit for the public archive, whose page
   * already sits at the build root.
   */
  hoistedPath?: string;
}

interface RewriteReport {
  filesScanned: number;
  filesChanged: number;
  replacements: (RewriteMapping & { count: number })[];
  /** Total occurrences replaced across every file. */
  total: number;
}

/** Strip a trailing slash so mappings join predictably. */
const trimSlash = (value: string) => value.replace(/\/$/, '');

/** The root-relative form of a URL — what a root-relative base path becomes. */
const toPath = (url: string) => trimSlash(new URL(url).pathname);

/**
 * The mappings that turn placeholder references into archive-relative ones,
 * **ordered longest-first**.
 *
 * That ordering is load-bearing, not tidiness: the absolute form of the base
 * contains the root-relative form as a substring, so replacing the short one
 * first would corrupt the long one.
 *
 * Note there's deliberately no separate mapping for the assets directory. Once
 * the base points at the archive root, `{base}/cdn/…` already resolves to
 * `{archive}/cdn/…`, because that's where the copied assets sit.
 */
export const deriveMappings = ({
  placeholderBase,
  archiveUrl,
  hoistedPath,
}: RewritePlan): RewriteMapping[] => {
  const base = trimSlash(placeholderBase);
  const basePath = toPath(placeholderBase);
  const url = trimSlash(archiveUrl);
  const urlPath = toPath(archiveUrl);
  const page = hoistedPath ? `/${trimSlash(hoistedPath)}` : '';

  const mappings: RewriteMapping[] = [
    // The hoisted page's own path collapses to the archive root.
    ...(page ?
      [
        { from: `${base}${page}`, to: url },
        { from: `${basePath}${page}`, to: urlPath },
      ]
    : []),
    { from: base, to: url },
    { from: basePath, to: urlPath },
  ];

  return mappings.sort((a, b) => b.from.length - a.from.length);
};

const walkFiles = (dir: string, files: string[] = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    // Don't follow symlinks: a staged archive should only ever contain its own
    // files, and following one could rewrite something outside the archive.
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walkFiles(entryPath, files);
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
};

/**
 * Apply `mappings` to every text file under `dir`, in place.
 *
 * Mappings are applied in the order given — use {@link deriveMappings} rather
 * than assembling them by hand, so the longest-first ordering is guaranteed.
 */
export const rewriteDir = (
  dir: string,
  mappings: RewriteMapping[]
): RewriteReport => {
  const counts = new Map(mappings.map(({ from }) => [from, 0]));
  let filesScanned = 0;
  let filesChanged = 0;

  for (const file of walkFiles(dir)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    filesScanned++;
    const original = fs.readFileSync(file, 'utf8');
    let rewritten = original;
    for (const { from, to } of mappings) {
      const parts = rewritten.split(from);
      if (parts.length === 1) continue;
      counts.set(from, counts.get(from)! + parts.length - 1);
      rewritten = parts.join(to);
    }
    if (rewritten === original) continue;
    fs.writeFileSync(file, rewritten);
    filesChanged++;
  }

  const replacements = mappings.map((mapping) => ({
    ...mapping,
    count: counts.get(mapping.from)!,
  }));

  return {
    filesScanned,
    filesChanged,
    replacements,
    total: replacements.reduce((sum, { count }) => sum + count, 0),
  };
};

/**
 * Throw if a page in `dir` references a file at this archive's own URL that
 * isn't in the archive.
 *
 * The point of a self-contained archive is that it serves itself, and the
 * rewrite alone can't tell you whether it does: rewriting
 * `{placeholder}/cdn/app.js` to `{archive}/cdn/app.js` succeeds whether or not
 * that file was ever copied in. So a project whose assets directory isn't where
 * the publisher looked for it would pack cleanly, pass every other check, and
 * 404 its own JavaScript in production.
 *
 * Only HTML is scanned, and only references that look like files — a path whose
 * last segment has an extension. Everything else is either not a request (the
 * assets base is baked in as a bare `{archive}/cdn`), a link to a page rather
 * than a file, or a URL built at runtime from fragments that can't be resolved
 * here.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */
export const assertReferencedFilesExist = (
  /** The edition directory the archive URL serves, i.e. where its pages sit. */
  editionDir: string,
  archiveUrl: string
) => {
  const base = archiveUrl.replace(/\/$/, '');
  const pattern = new RegExp(
    `(?:src|href|content)="(${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/[^"]+)"`,
    'g'
  );
  const missing = new Map<string, string>();

  for (const file of walkFiles(editionDir)) {
    if (!['.html', '.htm'].includes(path.extname(file).toLowerCase())) continue;
    for (const [, url] of fs.readFileSync(file, 'utf8').matchAll(pattern)) {
      const relative = url.slice(base.length + 1).split(/[?#]/)[0];
      // Not a file request: a directory, a link to a page, or the assets base.
      if (!path.extname(relative)) continue;
      // Archive URLs are absolute, so they resolve from the edition root
      // regardless of which page holds the reference.
      if (fs.existsSync(path.join(editionDir, relative))) continue;
      missing.set(relative, path.relative(editionDir, file));
    }
  }

  if (missing.size === 0) return;

  const list = [...missing]
    .map(([relative, page]) => `  ${relative} (referenced by ${page})`)
    .join('\n');

  throw new BuildError(
    `A packed archive references ${missing.size} file${missing.size === 1 ? '' : 's'} it doesn't contain:\n${list}`,
    {
      code: 'ARCHIVE_NOT_SELF_CONTAINED',
      hint: "Each archive carries its own copy of the app's assets. If the project writes them somewhere other than `dist/cdn`, set `build.assetsDir` in publisher.config.ts to match.",
      context: { editionDir, archiveUrl, missing: [...missing.keys()] },
    }
  );
};

/**
 * Throw if any un-rewritten URL token survives in `dir`.
 *
 * The rewrite is a string substitution over generated code, so this is the
 * check that turns "the assumption broke" into a loud failure at pack time
 * rather than a 404 in a published embed.
 */
export const assertNoResidualTokens = (
  dir: string,
  tokens: string[] = [PLACEHOLDER_TOKEN, PRERENDER_HOST_TOKEN]
) => {
  const offenders: { file: string; token: string }[] = [];

  for (const file of walkFiles(dir)) {
    if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
    const contents = fs.readFileSync(file, 'utf8');
    for (const token of tokens)
      if (contents.includes(token))
        offenders.push({ file: path.relative(dir, file), token });
  }

  if (offenders.length === 0) return;

  const list = offenders
    .map(({ file, token }) => `  ${file} (${token})`)
    .join('\n');

  throw new BuildError(
    `Found ${offenders.length} un-rewritten URL reference${offenders.length === 1 ? '' : 's'} in a packed archive:\n${list}`,
    {
      code: 'RESIDUAL_PLACEHOLDER_URL',
      hint: 'A page or asset baked in a URL the publisher could not rewrite. If a page reads `page.url.href` directly, use the injected base URL instead.',
      context: { dir, offenders },
    }
  );
};
