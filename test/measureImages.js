const GraphicsPublisher = require('../dist');
const expect = require('expect.js');
const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const prompts = require('prompts');

describe('GraphicsKitPublisher measures images', function() {
  this.timeout(20000);

  beforeEach(function() {
    mock({
      'src/statics/images/share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
      'src/statics/images/oversize.jpg': mock.load(path.resolve(__dirname, 'oversize.jpg')),
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
    sinon.restore();
  });

  it('Should optimise an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      quality: 70,
      option: 'optimise',
    }));
    sinon.replace(prompts, 'prompt', fake);

    const size = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);

    await graphicsPublisher.measureImages();

    const resize = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);

    expect(resize).to.be.lessThan(size);
  });

  it('Should resize an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      resizeWidth: 1200,
      option: 'resize',
    }));
    sinon.replace(prompts, 'prompt', fake);

    const size = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);

    await graphicsPublisher.measureImages();

    const resize = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);

    expect(resize).to.be.lessThan(size);
  });

  it('Should skip an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      option: null,
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const oks = JSON.parse(fs.readFileSync('node_modules/.reuters-graphics/image-size-ok.json'));

    expect(oks).to.contain('oversize.jpg');
  });

  it('Should write an image manifest', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      option: null,
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(fs.readFileSync('src/statics/images/manifest.json'));

    expect(manifest).to.eql({
      'oversize.jpg': {
        width: 2240,
        height: 1680,
        size: 214,
      },
      'share.jpg': {
        width: 2400,
        height: 1350,
        size: 80,
      },
    });
  });

  it('Should update an image manifest after resize', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      resizeWidth: 1200,
      option: 'resize',
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(fs.readFileSync('src/statics/images/manifest.json'));

    expect(manifest).to.eql({
      'oversize.jpg': {
        width: 1200,
        height: 900,
        size: 53,
      },
      'share.jpg': {
        width: 2400,
        height: 1350,
        size: 80,
      },
    });
  });

  it('Should not prompt for an image if user does not want to optimise', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: false,
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(fs.readFileSync('src/statics/images/manifest.json'));

    expect(manifest['oversize.jpg'].width).to.be(2240);
  });

  it('Should not prompt for an image if in serverless environment', async function() {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      confirm: true,
      resizeWidth: 1200,
      option: 'resize',
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(fs.readFileSync('src/statics/images/manifest.json'));

    expect(manifest['oversize.jpg'].width).to.be(2240);

    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });
});
