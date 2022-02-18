const GraphicsPublisher = require('../dist');
const expect = require('expect.js');
const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const PNG = require('pngjs').PNG;
const pixelmatch = require('pixelmatch');

describe('GraphicsKitPublisher packs project', function() {
  this.timeout(20000);

  beforeEach(function() {
    mock({
      'CLIENT_README.txt': 'Custom client docs',
      'src/statics/images/share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
      'src/statics/images/share-embed.jpg': mock.load(path.resolve(__dirname, 'img2.jpg')),
      'locales/en/content.json': JSON.stringify({ SEOTitle: 'title', SEODescription: 'description' }),
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
      node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
      'package.json': JSON.stringify({ scripts: { build: '' }, homepage: 'https://graphics.reuters.com/project/' }),
      dist: {
        'index.html': `<html>
          <head>
            <meta property="og:image" content="https://graphics.reuters.com/project/cdn/images/share.jpg" />
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
    }, { createCwd: false });
  });

  afterEach(function() {
    mock.restore();
  });

  it('Should not set homepage if not in package.json', async function() {
    fs.writeFileSync('package.json', '{}');
    const graphicsPublisher = new GraphicsPublisher();
    const returned = graphicsPublisher.getHomepage();
    expect(returned).to.be(null);
    expect(graphicsPublisher.homepage).to.be(undefined);
  });

  it('Should error if homepage in package.json is wrong hostname', async function() {
    fs.writeFileSync('package.json', JSON.stringify({ homepage: 'https://www.google.com/project' }));
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.getHomepage();
    } catch (e) {
      expect(e.name).to.be('PackageMetadataError');
      expect(e.message).to.contain(chalk`Invalid {yellow homepage} in {cyan package.json}`);
    }
  });

  it('Should set homepage from package.json', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    expect(graphicsPublisher.homepage).to.be('https://graphics.reuters.com/project/');
  });

  it('Should create public edition from dist', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.makePublicEdition();
    expect(fs.existsSync('graphics-pack/public/interactive/index.html')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/js/chunk2.js')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/css/styles1.css')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/nested/css/styles4.css')).to.be(true);
  });

  it('Should create public edition from dist', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.makePublicEdition();
    expect(fs.existsSync('graphics-pack/public/interactive/index.html')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/js/chunk2.js')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/css/styles1.css')).to.be(true);
    expect(fs.existsSync('graphics-pack/public/interactive/cdn/nested/css/styles4.css')).to.be(true);
  });

  it('Should create embed editions from dist', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    expect(fs.existsSync('graphics-pack/media-en-chart/interactive/index.html')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-chart/media-interactive/app.zip')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-chart/media-interactive/EMBED.txt')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-chart/media-interactive/README.txt')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-chart/media-interactive/app.zip')).to.be(true);

    expect(fs.existsSync('graphics-pack/media-de-chart/interactive/index.html')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-de-chart/media-interactive/app.zip')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-de-chart/media-interactive/EMBED.txt')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-de-chart/media-interactive/README.txt')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-de-chart/media-interactive/app.zip')).to.be(true);
  });

  it('Should correctly write the embed docs', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    const EMBED = fs.readFileSync('graphics-pack/media-de-chart/media-interactive/EMBED.txt', 'utf-8');
    expect(EMBED).to.contain('https://graphics.reuters.com/project/embeds/de/chart/index.html');
    expect(EMBED).to.contain('new pym.Parent("media-de-chart"');
    expect(EMBED).to.contain('<div id="media-de-chart"></div>');
  });

  it('Should correctly write the readme docs', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makeEmbedEditions();
    const README = fs.readFileSync('graphics-pack/media-de-chart/media-interactive/README.txt', 'utf-8');
    expect(README).to.contain('REUTERS GRAPHICS');
    expect(README).to.contain('Custom client docs');
  });

  it('Should create embed preview images', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();

    const medImg1Exists = fs.existsSync('graphics-pack/media-en-chart/media-interactive/_gfxpreview.png');
    const medImg2Exists = fs.existsSync('graphics-pack/media-de-chart/media-interactive/_gfxpreview.png');
    const intImg1Exists = fs.existsSync('graphics-pack/media-en-chart/interactive/_gfxpreview.png');
    const intImg2Exists = fs.existsSync('graphics-pack/media-de-chart/interactive/_gfxpreview.png');

    expect(medImg1Exists).to.be(true);
    expect(medImg2Exists).to.be(true);
    expect(intImg1Exists).to.be(true);
    expect(intImg2Exists).to.be(true);

    const img1 = PNG.sync.read(fs.readFileSync('graphics-pack/media-en-chart/media-interactive/_gfxpreview.png'));
    const img2 = PNG.sync.read(fs.readFileSync('graphics-pack/media-de-chart/media-interactive/_gfxpreview.png'));
    const { width, height } = img1;
    const pixelsDiff = pixelmatch(img1.data, img2.data, null, width, height);
    // Should be the same image
    expect(pixelsDiff).to.be(0);
  });

  it('Should throw if no share image found on homepage', async function() {
    fs.writeFileSync('dist/index.html', '<html><head></head><body></body></html>');
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    try {
      await graphicsPublisher.makePreviewImages();
      expect(true).to.be(false);
    } catch (e) {
      expect(e.name).to.be('FileNotFoundError');
      expect(e.message).to.contain('No share image found in metadata');
    }
  });

  it('Should throw if share image is not a valid image type', async function() {
    fs.writeFileSync('dist/index.html', `
    <html>
    <head>
    <meta property="og:image" content="https://graphics.reuters.com/project/cdn/" />
    </head>
    <body></body>
    </html>
    `);
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    try {
      await graphicsPublisher.makePreviewImages();
      expect(true).to.be(false);
    } catch (e) {
      expect(e.name).to.be('InvalidFileTypeError');
      expect(e.message).to.contain('Invalid share image found in metadata');
    }
  });

  it('Should throw if share image is not locally found', async function() {
    fs.writeFileSync('dist/index.html', `
    <html>
    <head>
    <meta property="og:image" content="https://graphics.reuters.com/project/cdn/images/missing.jpg" />
    </head>
    <body></body>
    </html>
    `);
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    try {
      await graphicsPublisher.makePreviewImages();
      expect(true).to.be(false);
    } catch (e) {
      expect(e.name).to.be('FileNotFoundError');
      expect(e.message).to.contain('Could not find local copy of share image');
    }
  });

  it('Should create different preview images for embeds', async function() {
    fs.writeFileSync('dist/embeds/de/chart/index.html', `
    <html>
    <head>
    <meta property="og:image" content="https://graphics.reuters.com/project/cdn/images/share-embed.jpg" />
    </head>
    <body></body>
    </html>
    `);
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();

    const img1 = PNG.sync.read(fs.readFileSync('graphics-pack/media-en-chart/media-interactive/_gfxpreview.png'));
    const img2 = PNG.sync.read(fs.readFileSync('graphics-pack/media-de-chart/media-interactive/_gfxpreview.png'));
    // Should be different images
    expect(img1.width).to.not.be(img2.width);
    expect(img1.height).to.not.be(img2.height);
  });

  it('Should create static asset editions', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    graphicsPublisher.getHomepage();
    await graphicsPublisher.makePublicEdition();
    await graphicsPublisher.makeEmbedEditions();
    await graphicsPublisher.makePreviewImages();
    await graphicsPublisher.makeAssetEditions();

    expect(fs.existsSync('graphics-pack/media-en-chart/JPG/chart.jpg')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-chart/EPS/chart.eps')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-en-map/JPG/my-map.jpg')).to.be(true);
    expect(fs.existsSync('graphics-pack/media-de-chart/JPG/chart.jpg')).to.be(true);
  });
});
