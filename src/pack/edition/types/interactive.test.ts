import { describe, it, expect, afterEach, vi, type Mock } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
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
      'dist/index.html': dedent`
        <html>
        <head>
          <link rel="canonical" href="https://www.reuters.com/graphics/my-project/" />
          <link rel="stylesheet" href="https://www.reuters.com/graphics/my-project/cdn/styles/main.css">
          <script src="https://www.reuters.com/graphics/my-project/cdn/scripts/app.js"></script>
          <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
        </head>
        </html>`,
      'dist/cdn/scripts/app.js': 'console.log("public app");',
      'dist/cdn/styles/main.css': 'body { padding: 0; }',
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
    // Should not create manifest or static image
    expect(
      fs.existsSync('graphics-pack/public/interactive/manifest.json')
    ).toBe(false);
    expect(
      fs.existsSync('graphics-pack/public/interactive/statics/graphic.png')
    ).toBe(false);
  });

  it('should pack up media interactive', async () => {
    mockFs({
      'dist/embeds/en/page/index.html': dedent`
        <html>
        <head>
          <link rel="canonical" href="https://www.reuters.com/graphics/my-project/embeds/en/page/" />
          <link rel="stylesheet" href="https://www.reuters.com/graphics/my-project/cdn/styles/main.css">
          <link rel="modulepreload" href="https://www.reuters.com/graphics/my-project/cdn/scripts/chunk.js">
          <script src="https://www.reuters.com/graphics/my-project/cdn/scripts/app.js"></script>
          <meta property="og:image" content="https://www.reuters.com/graphics/my-project/cdn/images/my-image.jpg" />
        </head>
        </html>`,
      'dist/cdn/scripts/app.js': "console.log('app');",
      'dist/cdn/scripts/chunk.js': 'export const chunk = true;',
      'dist/cdn/styles/main.css': 'body { margin: 0; }',
      'dist/cdn/images/my-image.jpg': mockFs.load(
        path.join(__dirname, 'test.jpg')
      ),
      'package.json': JSON.stringify({
        homepage: 'https://www.reuters.com/graphics/ABC123/',
        reuters: {
          graphic: {
            archives: {
              'media-en-page': {
                url: 'https://www.reuters.com/graphics/XYZ789/',
              },
            },
          },
        },
      }),
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
    expect(
      fs.existsSync('graphics-pack/media-en-page/interactive/manifest.json')
    ).toBe(true);
    expect(
      fs.existsSync(
        'graphics-pack/media-en-page/interactive/statics/graphic.png'
      )
    ).toBe(true);
    const manifest = JSON.parse(
      fs.readFileSync(
        'graphics-pack/media-en-page/interactive/manifest.json',
        'utf8'
      )
    );
    expect(manifest).toMatchInlineSnapshot(`
      {
        "caption": "",
        "embeds": {
          "embedCode": {
            "declaration": "",
            "dependencies": "",
          },
          "image": {
            "id": "",
            "url": "https://www.reuters.com/graphics/XYZ789/statics/graphic.png",
          },
          "url": "https://www.reuters.com/graphics/XYZ789/",
        },
        "id": "",
        "pack": {
          "canonicalUrl": "https://www.reuters.com/graphics/ABC123/",
          "caption": "",
          "id": "",
          "title": "",
        },
        "rootUrl": "https://www.reuters.com/graphics/XYZ789/",
        "title": "",
      }
    `);

    // Verify SRI attributes were added to index.html
    const indexHtml = fs.readFileSync(
      'graphics-pack/media-en-page/interactive/index.html',
      'utf8'
    );

    // Should have integrity attributes on all three resources
    const integrityMatches = indexHtml.match(/integrity="sha384-/g);
    expect(integrityMatches).toHaveLength(3);

    // Verify each resource has the correct hash
    // Calculate expected hashes
    const appJsContent = "console.log('app');";
    const appJsHash = `sha384-${crypto
      .createHash('sha384')
      .update(appJsContent)
      .digest('base64')}`;

    const chunkJsContent = 'export const chunk = true;';
    const chunkJsHash = `sha384-${crypto
      .createHash('sha384')
      .update(chunkJsContent)
      .digest('base64')}`;

    const cssContent = 'body { margin: 0; }';
    const cssHash = `sha384-${crypto
      .createHash('sha384')
      .update(cssContent)
      .digest('base64')}`;

    // Check that the hashes are present in the HTML
    expect(indexHtml).toContain(`integrity="${appJsHash}"`);
    expect(indexHtml).toContain(`integrity="${chunkJsHash}"`);
    expect(indexHtml).toContain(`integrity="${cssHash}"`);

    // Verify crossorigin attributes were added
    expect(indexHtml).toContain('crossorigin="anonymous"');
    const crossoriginMatches = indexHtml.match(/crossorigin="anonymous"/g);
    expect(crossoriginMatches).toHaveLength(3);
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
    pack.serverClient = getServerClient();
    pack.metadata.id = 'fakeid';
    pack.metadata.title = 'A title';
    pack.metadata.description = 'A description';
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
