import * as url from 'url';

import { GraphicsPublisher } from '..';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import PNG from 'pngjs';
import fs from 'fs';
import mock from 'mock-fs';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { graphicsProfile, nodeModules, packageJson } from './utils/mockFs';
import {
  EditionArchiveError,
  FileNotFoundError,
  InvalidFileTypeError,
  PackageMetadataError,
} from '../exceptions/errors';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

beforeEach(() => {
  mock(
    {
      ...graphicsProfile,
      ...nodeModules,
      ...packageJson,
      'CLIENT_README.txt': 'Custom client docs',
      'oversize.jpg': mock.load(path.resolve(__dirname, 'oversize.jpg')),
      'src/statics/images/share.jpg': mock.load(
        path.resolve(__dirname, 'img.jpg')
      ),
      'src/statics/images/share-embed.jpg': mock.load(
        path.resolve(__dirname, 'img2.jpg')
      ),
      'locales/en/content.json': JSON.stringify({
        SEOTitle: 'title',
        SEODescription: 'description',
      }),
      'media-assets': {
        en: {
          chart: {
            'chart.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
            'chart.eps': 'zzz',
          },
          map: {
            'my-map.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
          },
        },
        de: {
          chart: {
            'chart.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
          },
        },
      },
      dist: {
        'index.html': `<html>
        <head>
          <meta property="og:image" content="https://www.reuters.com/graphics/project/cdn/images/share.jpg" />
        </head>
        <body></body>
      </html>`,
        cdn: {
          js: { 'chunk1.js': 'z', 'chunk2.js': 'z' },
          css: { 'styles1.css': 'z', 'styles2.css': 'z' },
          nested: {
            js: { 'chunk3.js': 'z', 'chunk4.js': 'z' },
            css: { 'styles3.css': 'z', 'styles4.css': 'z' },
          },
          images: {
            'share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
            'share-embed.jpg': mock.load(path.resolve(__dirname, 'img2.jpg')),
          },
        },
        embeds: {
          en: { chart: { 'index.html': '<html></html>' } },
          de: { chart: { 'index.html': '<html></html>' } },
        },
      },
      'graphics-pack': { 'app.zip': 'zzz' },
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
});

describe('GraphicsKitPublisher packs project', () => {
  it('Should not set homepage if not in package.json', async () => {
    fs.writeFileSync('package.json', '{}');
    const graphicsPublisher = new GraphicsPublisher();
    const returned = graphicsPublisher.getHomepage();
    expect(returned).toBeNull();
  });

  it('Should error if homepage in package.json is wrong hostname', async () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({ homepage: 'https://www.google.com/project' })
    );

    const graphicsPublisher = new GraphicsPublisher();
    expect(graphicsPublisher.getHomepage).toThrowError(PackageMetadataError);
  });

  it('Should set homepage from package.json', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const homepage = graphicsPublisher.getHomepage();
    expect(homepage).toBe('https://www.reuters.com/graphics/project/');
  });

  it('Should create public edition from dist', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.makePublicEdition();
    expect(fs.existsSync('graphics-pack/public/interactive/index.html')).toBe(
      true
    );
    expect(
      fs.existsSync('graphics-pack/public/interactive/cdn/js/chunk2.js')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/public/interactive/cdn/css/styles1.css')
    ).toBe(true);
    expect(
      fs.existsSync(
        'graphics-pack/public/interactive/cdn/nested/css/styles4.css'
      )
    ).toBe(true);
  });

  it('Should create embed editions from dist', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    expect(
      fs.existsSync('graphics-pack/media-en-chart/interactive/index.html')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-en-chart/media-interactive/app.zip')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-en-chart/media-interactive/EMBED.txt')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-en-chart/media-interactive/README.txt')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-en-chart/media-interactive/app.zip')
    ).toBe(true);

    expect(
      fs.existsSync('graphics-pack/media-de-chart/interactive/index.html')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-de-chart/media-interactive/app.zip')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-de-chart/media-interactive/EMBED.txt')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-de-chart/media-interactive/README.txt')
    ).toBe(true);
    expect(
      fs.existsSync('graphics-pack/media-de-chart/media-interactive/app.zip')
    ).toBe(true);
  });

  it('Should correctly write the embed docs', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    const EMBED = fs.readFileSync(
      'graphics-pack/media-de-chart/media-interactive/EMBED.txt',
      'utf-8'
    );
    expect(EMBED).toContain(
      'https://www.reuters.com/graphics/project/embeds/de/chart/index.html'
    );
    expect(EMBED).toContain('new pym.Parent("media-de-chart"');
    expect(EMBED).toContain('<div id="media-de-chart"></div>');
  });

  it('Should correctly write the readme docs', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    const README = fs.readFileSync(
      'graphics-pack/media-de-chart/media-interactive/README.txt',
      'utf-8'
    );
    expect(README).toContain('REUTERS GRAPHICS');
    expect(README).toContain('Custom client docs');
  });

  it('Should create embed preview images', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();

    const pubImgExists = fs.existsSync(
      'graphics-pack/public/interactive/_gfxpreview.png'
    );
    const medImg1Exists = fs.existsSync(
      'graphics-pack/media-en-chart/media-interactive/_gfxpreview.png'
    );
    const medImg2Exists = fs.existsSync(
      'graphics-pack/media-de-chart/media-interactive/_gfxpreview.png'
    );
    const intImg1Exists = fs.existsSync(
      'graphics-pack/media-en-chart/interactive/_gfxpreview.png'
    );
    const intImg2Exists = fs.existsSync(
      'graphics-pack/media-de-chart/interactive/_gfxpreview.png'
    );

    expect(pubImgExists).toBe(true);
    expect(medImg1Exists).toBe(true);
    expect(medImg2Exists).toBe(true);
    expect(intImg1Exists).toBe(true);
    expect(intImg2Exists).toBe(true);

    const img1 = PNG.PNG.sync.read(
      fs.readFileSync(
        'graphics-pack/media-en-chart/media-interactive/_gfxpreview.png'
      )
    );
    const img2 = PNG.PNG.sync.read(
      fs.readFileSync(
        'graphics-pack/media-de-chart/media-interactive/_gfxpreview.png'
      )
    );
    const { width, height } = img1;
    const pixelsDiff = pixelmatch(img1.data, img2.data, null, width, height);
    // Should be the same image
    expect(pixelsDiff).toBe(0);
  });

  it('Should throw if no share image found on homepage', async () => {
    fs.writeFileSync(
      'dist/index.html',
      '<html><head></head><body></body></html>'
    );
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await expect(() =>
      graphicsPublisher.makePreviewImages()
    ).rejects.toThrowError(FileNotFoundError);
  });

  it('Should throw if share image is not a valid image type', async () => {
    fs.writeFileSync(
      'dist/index.html',
      `
    <html>
    <head>
    <meta property="og:image" content="https://www.reuters.com/graphics/project/cdn/" />
    </head>
    <body></body>
    </html>
    `
    );
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await expect(() =>
      graphicsPublisher.makePreviewImages()
    ).rejects.toThrowError(InvalidFileTypeError);
  });

  it('Should throw if share image is not locally found', async () => {
    fs.writeFileSync(
      'dist/index.html',
      `
    <html>
    <head>
    <meta property="og:image" content="https://www.reuters.com/graphics/project/cdn/images/missing.jpg" />
    </head>
    <body></body>
    </html>
    `
    );
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await expect(() =>
      graphicsPublisher.makePreviewImages()
    ).rejects.toThrowError(FileNotFoundError);
  });

  it('Should create different preview images for embeds', async () => {
    fs.writeFileSync(
      'dist/embeds/de/chart/index.html',
      `
    <html>
    <head>
    <meta property="og:image" content="https://www.reuters.com/graphics/project/cdn/images/share-embed.jpg" />
    </head>
    <body></body>
    </html>
    `
    );
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();

    const img1 = PNG.PNG.sync.read(
      fs.readFileSync(
        'graphics-pack/media-en-chart/media-interactive/_gfxpreview.png'
      )
    );
    const img2 = PNG.PNG.sync.read(
      fs.readFileSync(
        'graphics-pack/media-de-chart/media-interactive/_gfxpreview.png'
      )
    );
    // Should be different images
    expect(img1.width).not.toBe(img2.width);
    expect(img1.height).not.toBe(img2.height);
  });

  it('Should create static asset editions', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();
    await graphicsPublisher.makeAssetEditions();

    expect(fs.existsSync('graphics-pack/media-en-chart/JPG/chart.jpg')).toBe(
      true
    );
    expect(fs.existsSync('graphics-pack/media-en-chart/EPS/chart.eps')).toBe(
      true
    );
    expect(fs.existsSync('graphics-pack/media-en-map/JPG/my-map.jpg')).toBe(
      true
    );
    expect(fs.existsSync('graphics-pack/media-de-chart/JPG/chart.jpg')).toBe(
      true
    );
  });

  it('Should create edition archives', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();
    await graphicsPublisher.makeAssetEditions();
    await graphicsPublisher.archiveEditions();

    expect(fs.existsSync('graphics-pack/media-en-chart/JPG/chart.jpg')).toBe(
      false
    );
    expect(fs.existsSync('graphics-pack/media-en-chart/EPS/chart.eps')).toBe(
      false
    );
    expect(fs.existsSync('graphics-pack/media-en-map/JPG/my-map.jpg')).toBe(
      false
    );
    expect(fs.existsSync('graphics-pack/media-de-chart/JPG/chart.jpg')).toBe(
      false
    );
    expect(fs.existsSync('graphics-pack/media-en-chart.zip')).toBe(true);
    expect(fs.existsSync('graphics-pack/media-en-map.zip')).toBe(true);
    expect(fs.existsSync('graphics-pack/media-de-chart.zip')).toBe(true);
    expect(fs.existsSync('graphics-pack/public.zip')).toBe(true);
  });

  it('Should error if edition archive size is too large for RNGS', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();
    await graphicsPublisher.makeAssetEditions();

    // Add enough files to make an edition too large
    for (const i of [...Array(1000).keys()]) {
      fs.copyFileSync(
        'oversize.jpg',
        `graphics-pack/media-en-map/oversize-${i}.jpg`
      );
    }

    await expect(() =>
      graphicsPublisher.archiveEditions()
    ).rejects.toThrowError(EditionArchiveError);

    // Should correctly create edition archives within size limit
    expect(fs.existsSync('graphics-pack/media-de-chart.zip')).toBe(true);
    expect(fs.existsSync('graphics-pack/media-en-chart.zip')).toBe(true);
    // Should create archive too big, but then error
    expect(fs.existsSync('graphics-pack/media-en-map.zip')).toBe(true);
    // Should not create more edition archives after error
    expect(fs.existsSync('graphics-pack/public.zip')).toBe(false);
  });
}, 30_000);
