import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import dedent from 'dedent';
import unzipper from 'unzipper';

import { setProject } from '../../__test__/project';
import { Pack } from '..';
import { Interactive } from '../edition/types/interactive';
import { PLACEHOLDER_BASE } from '../../constants/rewrite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** A real image, because the preview-image step runs it through sharp. */
const IMAGE = fs.readFileSync(
  path.join(__dirname, '../edition/types/test.jpg')
);

const BASE = PLACEHOLDER_BASE.replace(/\/$/, '');
const MAP_URL = 'https://www.reuters.com/graphics/my-graphic/wild/mapmapmap';
const PUBLIC_URL = 'https://www.reuters.com/graphics/my-graphic/wild/publicpub';

/** Read one file out of a packed archive. */
const bufferFromZip = async (zipPath: string, entryPath: string) => {
  const directory = await unzipper.Open.file(zipPath);
  const entry = directory.files.find((file) => file.path === entryPath);
  if (!entry) throw new Error(`${entryPath} not found in ${zipPath}`);
  return entry.buffer();
};

const readFromZip = async (zipPath: string, entryPath: string) =>
  (await bufferFromZip(zipPath, entryPath)).toString('utf8');

const listZip = async (zipPath: string) =>
  (await unzipper.Open.file(zipPath)).files.map((file) => file.path);

/**
 * A build against the placeholder base, the way `buildForProduction` leaves it.
 * The asset files reference the base too, so rewriting changes their bytes —
 * which is what makes the SRI ordering testable below.
 */
const placeholderBuild = {
  'dist/index.html': dedent`<html><head>
    <link rel="canonical" href="${BASE}/" />
    <meta property="og:image" content="${BASE}/cdn/images/my-image.jpg" />
    </head></html>`,
  'dist/embeds/en/map/index.html': dedent`<html><head>
    <link rel="canonical" href="${BASE}/embeds/en/map/" />
    <link rel="stylesheet" href="${BASE}/cdn/styles/main.css">
    <script src="${BASE}/cdn/scripts/app.js"></script>
    <meta property="og:image" content="${BASE}/cdn/images/my-image.jpg" />
    </head></html>`,
  'dist/cdn/scripts/app.js': `fetch("${BASE}/cdn/data.json");`,
  'dist/cdn/styles/main.css': `body { background: url("${BASE}/cdn/bg.png"); }`,
  'dist/cdn/images/my-image.jpg': IMAGE,
};

const pkg = (archives: Record<string, { url: string }>) =>
  JSON.stringify({
    homepage: PUBLIC_URL,
    reuters: { graphic: { archives } },
  });

const mapArchive = () => {
  const pack = new Pack();
  const edition = new Interactive(
    pack,
    'dist/embeds/en/map/index.html',
    'en',
    'map'
  );
  return edition.archive;
};

beforeEach(() => {
  setProject({
    ...placeholderBuild,
    'package.json': pkg({ 'media-en-map': { url: MAP_URL } }),
  });
});

describe('Archive.packUp', () => {
  it('rewrites the archive to its own URL', async () => {
    const zipPath = await mapArchive().packUp();
    const html = await readFromZip(
      zipPath,
      'media-en-map/interactive/index.html'
    );

    // The page's own path collapses to the archive root...
    expect(html).toContain(`href="${MAP_URL}/"`);
    // ...and its assets point at this archive's copy of them.
    expect(html).toContain(`href="${MAP_URL}/cdn/styles/main.css"`);
    expect(html).toContain(`src="${MAP_URL}/cdn/scripts/app.js"`);
    expect(html).not.toContain('__GKP_BASE__');
  });

  it('carries its own copy of the assets', async () => {
    const entries = await listZip(await mapArchive().packUp());

    expect(entries).toContain('media-en-map/interactive/cdn/scripts/app.js');
    expect(entries).toContain('media-en-map/interactive/cdn/styles/main.css');
    expect(entries).toContain(
      'media-en-map/interactive/cdn/images/my-image.jpg'
    );
  });

  it('rewrites assets, not just pages', async () => {
    const zipPath = await mapArchive().packUp();

    expect(
      await readFromZip(zipPath, 'media-en-map/interactive/cdn/scripts/app.js')
    ).toBe(`fetch("${MAP_URL}/cdn/data.json");`);
    expect(
      await readFromZip(zipPath, 'media-en-map/interactive/cdn/styles/main.css')
    ).toContain(`url("${MAP_URL}/cdn/bg.png")`);
  });

  it('hashes assets for SRI after rewriting them, not before', async () => {
    // The ordering that matters: SRI hashes asset *contents*, and rewriting
    // changes them. Hash first and every integrity attribute is wrong for the
    // file it guards, so browsers refuse to run the asset.
    const zipPath = await mapArchive().packUp();
    const html = await readFromZip(
      zipPath,
      'media-en-map/interactive/index.html'
    );
    const appJs = await readFromZip(
      zipPath,
      'media-en-map/interactive/cdn/scripts/app.js'
    );

    const expected = `sha384-${crypto
      .createHash('sha384')
      .update(appJs)
      .digest('base64')}`;

    expect(html).toContain(`integrity="${expected}"`);
    // Sanity: the pre-rewrite content would have hashed to something else.
    const preRewrite = `sha384-${crypto
      .createHash('sha384')
      .update(`fetch("${BASE}/cdn/data.json");`)
      .digest('base64')}`;
    expect(html).not.toContain(preRewrite);
  });

  it('leaves binary assets intact', async () => {
    const zipPath = await mapArchive().packUp();

    expect(
      (
        await bufferFromZip(
          zipPath,
          'media-en-map/interactive/cdn/images/my-image.jpg'
        )
      ).equals(IMAGE)
    ).toBe(true);
  });

  it('refuses to pack a media archive with no URL reserved', async () => {
    setProject({ ...placeholderBuild, 'package.json': pkg({}) });

    // A media archive trips the manifest's own URL check first — it writes the
    // archive URL into manifest.json — so that's the error that surfaces.
    await expect(mapArchive().packUp()).rejects.toThrowError(
      'Must get URL for interactive edition'
    );
  });

  it('refuses to pack the public archive with no URL reserved', async () => {
    // The public archive has no manifest, so the rewrite step is the only thing
    // standing between a missing URL and an archive full of placeholder links.
    setProject({ ...placeholderBuild, 'package.json': pkg({}) });
    const pack = new Pack();
    const archive = new Interactive(pack, 'dist/index.html', 'en').archive;

    await expect(archive.packUp()).rejects.toThrowError(
      'No URL yet for archive "public"'
    );
  });

  it('refuses to pack a build that never saw the placeholder', async () => {
    // The quiet failure this guards: if the app resolved a real base URL — an
    // older copy of this library, say — there's nothing to rewrite, and the
    // archive would ship pointing at the public archive's assets.
    setProject({
      'dist/embeds/en/map/index.html': dedent`<html><head>
        <link rel="canonical" href="https://www.reuters.com/graphics/real/embeds/en/map/" />
        <meta property="og:image" content="https://www.reuters.com/graphics/real/cdn/images/my-image.jpg" />
        </head></html>`,
      'dist/cdn/images/my-image.jpg': IMAGE,
      'package.json': pkg({ 'media-en-map': { url: MAP_URL } }),
    });

    await expect(mapArchive().packUp()).rejects.toThrowError(
      'Found no base URL to rewrite'
    );
  });

  it('packs the public archive without hoisting', async () => {
    setProject({
      ...placeholderBuild,
      'package.json': pkg({ public: { url: PUBLIC_URL } }),
    });
    const pack = new Pack();
    const archive = new Interactive(pack, 'dist/index.html', 'en').archive;

    const html = await readFromZip(
      await archive.packUp(),
      'public/interactive/index.html'
    );

    expect(html).toContain(`href="${PUBLIC_URL}/"`);
    expect(html).not.toContain('__GKP_BASE__');
  });
});
