import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { Interactive } from './interactive';
import { Pack } from '../..';
import dedent from 'dedent';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getServerClient } from '../../../server/client';
import { utils } from '@reuters-graphics/graphics-bin';

vi.mock('../../../server/client', () => ({
  getServerClient: vi.fn(),
}));

const __dirname = dirname(fileURLToPath(import.meta.url));

afterEach(() => {
  vi.clearAllMocks();
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

  it('getURL', async () => {
    (getServerClient as Mock).mockReturnValueOnce({
      createEditions: async (archive: string) => ({
        [archive]: {
          interactive: {
            url: 'https://graphics.reuters.com/my-project/embeds/en/page/',
          },
        },
      }),
    });
    mockFs({
      'dist/embeds/en/page/index.html': dedent`<html>
      <head>
      <link rel="canonical" href="https://www.reuters.com/graphics/my-project/embeds/en/page/" />
      <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
      </head>
      </html>`,
      'package.json': JSON.stringify({}),
    });

    const pack = new Pack();
    pack.metadata.id = 'fakeid';
    const interactive = new Interactive(
      pack,
      'dist/embeds/en/page/index.html',
      'en',
      'page'
    );
    interactive.archive.metadata.title = 'title';
    interactive.archive.metadata.description = 'description';

    const url1 = await interactive.getUrl();

    expect(url1).toBe(
      'https://www.reuters.com/graphics/my-project/embeds/en/page/'
    );

    expect(utils.getPkgProp('reuters.graphic.archives.media-en-page.url')).toBe(
      url1
    );

    const uploadedDate1 = new Date(
      utils.getPkgProp('reuters.graphic.archives.media-en-page.uploaded')
    );
    expect(uploadedDate1).toBeInstanceOf(Date);

    // Re mock and confirm this isn't called because it should
    // get value previously saved in package.json.
    (getServerClient as Mock).mockReturnValueOnce({
      createEditions: async (archive: string) => ({
        [archive]: {
          interactive: {
            url: 'https://graphics.reuters.com/my-project/embeds/en/page-2/',
          },
        },
      }),
    });

    expect(getServerClient).toHaveBeenCalledTimes(1);

    const url2 = await interactive.getUrl();

    expect(url2).toBe(
      'https://www.reuters.com/graphics/my-project/embeds/en/page/'
    );

    expect(utils.getPkgProp('reuters.graphic.archives.media-en-page.url')).toBe(
      url2
    );
    const uploadedDate2 = new Date(
      utils.getPkgProp('reuters.graphic.archives.media-en-page.uploaded')
    );
    expect(uploadedDate2).toStrictEqual(uploadedDate1);
  });
});
