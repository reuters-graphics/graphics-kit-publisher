import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { MediaInteractive } from './media-interactive';
import { Pack } from '../..';
import dedent from 'dedent';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  });
});
