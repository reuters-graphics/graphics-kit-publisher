const GraphicsPublisher = require('../dist');
const expect = require('expect.js');
const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const sinon = require('sinon');
const prompts = require('prompts');
const imgSize = require('image-size');
const { promisify } = require('util');
const os = require('os');

const asyncImgSize = promisify(imgSize);

describe('GraphicsKitPublisher measures images', function() {
  this.timeout(200000);

  beforeEach(function() {
    mock({
      [path.join(os.homedir(), '.reuters-graphics/profile.json')]: JSON.stringify({
        name: 'Graphics Staff',
        email: 'all.graphics@thomsonreuters.com',
        url: 'https://www.reuters.com',
        desk: 'london',
      }),
      'src/statics/images/share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
      'src/statics/images/oversize.jpg': mock.load(path.resolve(__dirname, 'oversize.jpg')),
      'src/statics/images/oversize.png': mock.load(path.resolve(__dirname, 'oversize.png')),
      'locales/en/content.json': JSON.stringify({ SEOTitle: 'title', SEODescription: 'description' }),
      'media-assets': {},
      node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
      'package.json': JSON.stringify({ scripts: { build: '' } }),
    }, { createCwd: false });
  });

  afterEach(function() {
    mock.restore();
    sinon.restore();
  });

  it('Should optimise an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'each',
      quality: 70,
      option: 'optimise',
    }));
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const sizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const resizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    expect(resizeJPG).to.be.lessThan(sizeJPG);
    expect(resizePNG).to.be.lessThan(sizePNG);
  });

  it('Should resize an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'each',
      resizeWidth: 1200,
      option: 'resize',
    }));
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const sizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const resizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    expect(resizeJPG).to.be.lessThan(sizeJPG);
    expect(resizePNG).to.be.lessThan(sizePNG);
  });

  it('Should optimise an image in bulk', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'all',
      quality: 60,
    }));
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const sizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(fs.statSync('src/statics/images/oversize.jpg').size / 1024);
    const resizePNG = Math.ceil(fs.statSync('src/statics/images/oversize.png').size / 1024);

    expect(resizeJPG).to.be.lessThan(sizeJPG);
    expect(resizePNG).to.be.lessThan(sizePNG);
  });

  it('Should resize and optimise an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'each',
      resizeWidth: 1200,
      quality: 70,
      option: 'both',
    }));
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();
    const { width: widthJPG } = await asyncImgSize('src/statics/images/oversize.jpg');
    expect(widthJPG).to.be(1200);
    const { width: widthPNG } = await asyncImgSize('src/statics/images/oversize.png');
    expect(widthPNG).to.be(1200);
  });

  it('Should skip an image if previously declined to optimize', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'each',
      option: null,
    }));
    sinon.replace(prompts, 'prompt', fake);

    const { width: ogWidth } = await asyncImgSize('src/statics/images/oversize.jpg');

    await graphicsPublisher.measureImages();
    sinon.restore();

    const fake2 = sinon.fake.returns(Promise.resolve({
      operation: 'each',
      resizeWidth: 100,
      option: 'resize',
    }));
    sinon.replace(prompts, 'prompt', fake2);

    await graphicsPublisher.measureImages();

    const { width: newWidth } = await asyncImgSize('src/statics/images/oversize.jpg');

    expect(ogWidth).to.be(newWidth);

    const manifest = JSON.parse(fs.readFileSync('src/statics/images/manifest.json'));

    expect(manifest['oversize.jpg'].optimised).to.be(false);
    expect(manifest['oversize.png'].optimised).to.be(false);
    expect(manifest['share.jpg'].optimised).to.be(undefined);
  });

  it('Should write an image manifest', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'each',
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
        optimised: false,
      },
      'oversize.png': {
        height: 1080,
        size: 1051,
        width: 1920,
        optimised: false,
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
      operation: 'each',
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
        optimised: false,
      },
      'oversize.png': {
        height: 675,
        size: 717,
        width: 1200,
        optimised: false,
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
      operation: 'each',
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

  it('Speed test with an image', async function() {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({
      operation: 'all',
      quality: 70,
    }));
    sinon.replace(prompts, 'prompt', fake);

    for (const i of [...Array(100).keys()]) {
      fs.copyFileSync('src/statics/images/oversize.jpg', `src/statics/images/oversize-img-${i}.jpg`);
    }

    const start = new Date().getTime();

    await graphicsPublisher.measureImages();

    const timeElapsed = (new Date().getTime() - start) / 1000;
    expect(timeElapsed).to.be.lessThan(60);
  });
});
