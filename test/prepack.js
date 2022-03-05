const GraphicsPublisher = require('../dist');
const expect = require('expect.js');
const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');

describe('GraphicsKitPublisher prepacks project', function() {
  this.timeout(20000);

  beforeEach(function() {
    mock({
      'src/statics/images/share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
      'locales/en/content.json': JSON.stringify({ SEOTitle: 'title', SEODescription: 'description' }),
      'media-assets': {},
      node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
      'package.json': JSON.stringify({ scripts: { build: '' } }),
      dist: {
        'index.html': '<html></html>',
        embeds: { en: { chart: { 'index.html': '<html></html>' } } },
      },
    }, { createCwd: false });
  });

  afterEach(function() {
    mock.restore();
  });

  it('Should set updated date in serverless', async function() {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const pubDate = new Date();
    pubDate.setDate(pubDate.getDate() - 1);
    fs.writeFileSync('package.json', JSON.stringify({
      reuters: {
        graphic: {
          published: pubDate.toISOString(),
        },
      },
      homepage: 'https://www.google.com',
    }));
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).not.to.be(undefined);
    expect(new Date(pkg.reuters.graphic.updated)).to.be.an(Date);
  });

  it('Should not set updated date in serverless if homepage not set', async function() {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    fs.writeFileSync('package.json', JSON.stringify({
      reuters: {
        graphic: {
          published: new Date().toISOString(),
        },
      },
    }));
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).to.be(undefined);
  });

  it('Should not set updated date in serverless if published date is in the future', async function() {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const pubDate = new Date();
    pubDate.setDate(pubDate.getDate() + 1);
    fs.writeFileSync('package.json', JSON.stringify({
      reuters: {
        graphic: {
          published: pubDate.toISOString(),
        },
      },
      homepage: 'https://www.google.com',
    }));
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).to.be(undefined);
  });
});
