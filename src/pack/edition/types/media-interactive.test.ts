import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
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

const __dirname = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  mockFs.restore();
});

describe('MediaInteractive edition', async () => {
  it('should pack up', async () => {
    mockFs({
      'dist/embeds/en/page/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/embeds/en/page/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': mockFs.load(
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
    mockFs({
      'dist/embeds/en/page/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/embeds/en/page/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': mockFs.load(
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
      `"media-en-page : https://www.reuters.com/graphics/my-project/embeds/en/page/ : 2025"`
    );
  });
});
