const GraphicsPublisher = require('../dist');
const expect = require('expect.js');
const mock = require('mock-fs');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const os = require('os');

describe('GraphicsKitPublisher validates source files', function() {
  this.timeout(20000);

  beforeEach(function() {
    mock({
      [path.join(os.homedir(), '.reuters-graphics/profile.json')]: JSON.stringify({
        name: 'Graphics Staff',
        email: 'all.graphics@thomsonreuters.com',
        url: 'https://www.reuters.com',
        desk: 'london',
      }),
      'src/statics/images/share.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
      'locales/en/content.json': JSON.stringify({ SEOTitle: 'title', SEODescription: 'description' }),
      'media-assets': {},
      node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
      'package.json': JSON.stringify({ scripts: { build: '' } }),
    });
  }, { createCwd: false });

  afterEach(function() {
    mock.restore();
  });

  it('Should verify startup directories', async function() {
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(true).to.be(true);
    } catch {
      expect(false).to.be(true);
    }
  });

  it('Should error if imagesDir does not exist', function() {
    fs.rmSync('src/statics/images/', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain('Directory for images not found');
    }
  });

  it('Should error if assetsDir does not exist', function() {
    fs.rmSync('media-assets', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain('Media assets directory');
    }
  });

  it('Should error if assetsDir has an invalid locale directory', function() {
    fs.mkdirSync('media-assets/zz/');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain('Invalid directory in media assets');
    }
  });

  it('Should error if valid locale in assetsDir has no jpg', function() {
    fs.mkdirSync('media-assets/en/chart/', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(chalk`Did not find a {cyan .jpg}`);
    }
  });

  it('Should error if script not run in location with a package.json', function() {
    fs.rmSync('package.json');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('LocationError');
      expect(e.message).to.contain(chalk`Unable to find {yellow package.json}`);
    }
  });

  it('Should error if localesDir does not exist', function() {
    fs.rmSync('locales', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(chalk`Locales directory {yellow locales} does not exist.`);
    }
  });

  it('Should error if localesDir has an invalid locale directory', function() {
    fs.mkdirSync('locales/zz/');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain('Invalid directory in locales:');
    }
  });

  it('Should error if localesDir is missing default locale directory', function() {
    fs.rmSync('locales/en/', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(chalk`Locale directory for default locale {cyan en} does not exist`);
    }
  });

  it('Should error if default locale directory in localesDir is missing metadata JSON', function() {
    fs.rmSync('locales/en/content.json');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateSourceFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(chalk`Default metadata JSON file {cyan content.json} does not exist`);
    }
  });
});
