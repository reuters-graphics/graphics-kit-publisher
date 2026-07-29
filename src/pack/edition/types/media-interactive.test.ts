import { describe, it, expect } from 'vitest';
import { setProject } from '../../../__test__/project';
import path from 'path';
import fs from 'fs';
import { MediaInteractive } from './media-interactive';
import { Pack } from '../..';
import dedent from 'dedent';
import { dirname } from 'node:path';
import unzipper from 'unzipper';
import { fileURLToPath } from 'node:url';
import { context } from '../../../context';
import { srcArchive } from '../utils/archive';
import { PLACEHOLDER_BASE } from '../../../constants/rewrite';

const RESERVED_URL =
  'https://www.reuters.com/graphics/my-project/embeds/en/page/';

/**
 * What a placeholder build leaves on disk: the page's own canonical is still the
 * sentinel, so anything client-facing has to come from the reserved URL that the
 * graphics server handed back, which lives in package.json.
 */
const placeholderPage = dedent`<html>
<head>
<link rel="canonical" href="${PLACEHOLDER_BASE}embeds/en/page/" />
<meta property="og:image" content="${PLACEHOLDER_BASE}cdn/images/my-image.jpg" />
</head>
</html>`;

const reservedUrlPkg = JSON.stringify({
  reuters: {
    graphic: { archives: { 'media-en-page': { url: RESERVED_URL } } },
  },
});

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('MediaInteractive edition', async () => {
  it('should pack up', async () => {
    setProject({
      'dist/embeds/en/page/index.html': placeholderPage,
      'package.json': reservedUrlPkg,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': fs.readFileSync(
        path.join(__dirname, 'test.jpg')
      ),
      '.gitignore': dedent`
      dist/
      `,
      src: {
        components: {
          'App.svelte': '<div></div>',
        },
      },
    });

    const pack = new Pack();
    const edition = new MediaInteractive(
      pack,
      './dist/embeds/en/page/index.html',
      'en',
      'page'
    );

    await edition.packUp('graphics-pack/media-en-page/');

    expect(
      fs.existsSync(
        'graphics-pack/media-en-page/media-interactive/_gfxpreview.png'
      )
    ).toBe(true);

    expect(
      fs.existsSync('graphics-pack/media-en-page/media-interactive/README.txt')
    ).toBe(true);

    expect(
      fs.readFileSync(
        'graphics-pack/media-en-page/media-interactive/README.txt',
        'utf8'
      )
    ).toMatchInlineSnapshot(
      `"https://www.reuters.com/graphics/my-project/embeds/en/page/"`
    );

    expect(
      fs.existsSync('graphics-pack/media-en-page/media-interactive/app.zip')
    ).toBe(true);

    const includedFiles: string[] = [];
    await new Promise<void>((resolve, reject) => {
      fs.createReadStream(
        'graphics-pack/media-en-page/media-interactive/app.zip'
      )
        .pipe(unzipper.Parse())
        .on('entry', (entry) => {
          includedFiles.push(entry.path);
          entry.autodrain();
        })
        .on('error', reject)
        .on('close', resolve);
    });

    expect(includedFiles).toContain('src/components/App.svelte');
    expect(includedFiles).not.toContain('dist/embeds/en/page/index.html');
  });

  it('should make doc with mustache template', async () => {
    // @ts-ignore Ok in test
    srcArchive.hasArchived = false;
    const originalValue = context.config.archiveEditions.docs['README.txt'];
    context.config.archiveEditions.docs['README.txt'] = 'template.txt';
    setProject({
      'dist/embeds/en/page/index.html': placeholderPage,
      'package.json': reservedUrlPkg,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': fs.readFileSync(
        path.join(__dirname, 'test.jpg')
      ),
      '.gitignore': dedent`
      dist/
      `,
      src: {
        components: {
          'App.svelte': '<div></div>',
        },
      },
      'template.txt': '{{ embedSlug }} : {{{ embedUrl }}} : {{ year }}',
    });

    const pack = new Pack();
    const edition = new MediaInteractive(
      pack,
      './dist/embeds/en/page/index.html',
      'en',
      'page'
    );

    await edition.packUp('graphics-pack/media-en-page/');

    context.config.archiveEditions.docs['README.txt'] = originalValue;

    expect(
      fs.existsSync('graphics-pack/media-en-page/media-interactive/README.txt')
    ).toBe(true);

    expect(
      fs.readFileSync(
        'graphics-pack/media-en-page/media-interactive/README.txt',
        'utf8'
      )
    ).toMatchInlineSnapshot(
      `"media-en-page : https://www.reuters.com/graphics/my-project/embeds/en/page/ : 2026"`
    );
  });

  it('refuses to write a doc before the archive has a URL', async () => {
    // @ts-ignore Ok in test
    srcArchive.hasArchived = false;
    setProject({
      'dist/embeds/en/page/index.html': placeholderPage,
      'dist/cdn/images/my-image.jpg': fs.readFileSync(
        path.join(__dirname, 'test.jpg')
      ),
      '.gitignore': 'dist/',
      // No reserved URL in package.json for this archive.
    });

    const pack = new Pack();
    const edition = new MediaInteractive(
      pack,
      './dist/embeds/en/page/index.html',
      'en',
      'page'
    );

    await expect(
      edition.packUp('graphics-pack/media-en-page/')
    ).rejects.toThrowError('No URL yet for archive "media-en-page"');
  });
});
