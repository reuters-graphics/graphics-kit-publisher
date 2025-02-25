import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { Interactive } from './interactive';
import { Pack } from '../..';
import dedent from 'dedent';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  mockFs.restore();
});

describe('Interactive edition', async () => {
  it('should pack up public interactive', async () => {
    mockFs({
      'dist/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': mockFs.load(
        path.join(__dirname, 'test.jpg')
      ),
    });

    const pack = new Pack();
    const interactive = new Interactive(pack, './dist/index.html', 'en');

    await interactive.packUp('graphics-pack/public/');

    expect(fs.existsSync('graphics-pack/public/interactive/index.html')).toBe(
      true
    );
    expect(
      fs.existsSync('graphics-pack/public/interactive/cdn/scripts/app.js')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/public/interactive/_gfxpreview.png')
    ).toBe(true);
  });

  it('should pack up media interactive', async () => {
    mockFs({
      'dist/embeds/en/page/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/embeds/en/page" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'dist/cdn/scripts/app.js': '',
      'dist/cdn/images/my-image.jpg': mockFs.load(
        path.join(__dirname, 'test.jpg')
      ),
    });

    const pack = new Pack();
    const interactive = new Interactive(
      pack,
      'dist/embeds/en/page/index.html',
      'en',
      'page'
    );

    await interactive.packUp('graphics-pack/media-en-page/');

    expect(
      fs.existsSync('graphics-pack/media-en-page/interactive/index.html')
    ).toBe(true);
    expect(
      fs.existsSync(
        'graphics-pack/media-en-page/interactive/cdn/scripts/app.js'
      )
    ).toBe(false);
    expect(
      fs.existsSync('graphics-pack/media-en-page/interactive/_gfxpreview.png')
    ).toBe(true);
  });
});
