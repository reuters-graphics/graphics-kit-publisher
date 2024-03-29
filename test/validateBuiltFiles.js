import * as url from 'url';

import { GraphicsPublisher } from '../dist/index.js';
import chalk from 'chalk';
import expect from 'expect.js';
import fs from 'fs';
import mock from 'mock-fs';
import os from 'os';
import path from 'path';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

describe('GraphicsKitPublisher validates built files', function () {
  this.timeout(20000);

  beforeEach(function () {
    mock(
      {
        [path.join(os.homedir(), '.reuters-graphics/profile.json')]:
          JSON.stringify({
            name: 'Graphics Staff',
            email: 'all.graphics@thomsonreuters.com',
            url: 'https://www.reuters.com',
            desk: 'london',
          }),
        'src/statics/images/share.jpg': mock.load(
          path.resolve(__dirname, 'img.jpg')
        ),
        'locales/en/content.json': JSON.stringify({
          SEOTitle: 'title',
          SEODescription: 'description',
        }),
        'media-assets': {},
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
        'package.json': JSON.stringify({ scripts: { build: '' } }),
        dist: {
          'index.html': '<html></html>',
          embeds: { en: { chart: { 'index.html': '<html></html>' } } },
        },
      },
      { createCwd: false }
    );
  });

  afterEach(function () {
    mock.restore();
  });

  it('Should verify dist directory', async function () {
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(true).to.be(true);
    } catch {
      expect(false).to.be(true);
    }
  });

  it('Should error if dist/index.html does not exist', function () {
    fs.rmSync('dist/index.html');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(
        chalk`Did not find an {cyan index.html} file in {yellow dist}.`
      );
    }
  });

  it('Should error if invalid locale directory in embeds', function () {
    fs.mkdirSync('dist/embeds/zz', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain('Invalid directory in embeds');
    }
  });

  it('Should error if valid locale directory in embeds has no index.html', function () {
    fs.mkdirSync('dist/embeds/es/chart', { recursive: true });
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(
        chalk`Did not find an {cyan index.html} file`
      );
    }
  });

  it('Should error if embed page is not slugified', function () {
    fs.mkdirSync('dist/embeds/en/not_slugged', { recursive: true });
    fs.writeFileSync('dist/embeds/en/not_slugged/index.html', 'zzz');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(
        chalk`Embed pages should be slugified. Maybe rename {cyan embeds/en/not_slugged} to {green embeds/en/not-slugged}?`
      );
    }
    fs.rmSync('dist/embeds/en/not_slugged', { recursive: true });

    fs.mkdirSync('dist/embeds/en/notLowerCased', { recursive: true });
    fs.writeFileSync('dist/embeds/en/notLowerCased/index.html', 'zzz');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('FileSystemError');
      expect(e.message).to.contain(
        chalk`Embed pages should be slugified. Maybe rename {cyan embeds/en/notLowerCased} to {green embeds/en/notlowercased}?`
      );
    }
    fs.rmSync('dist/embeds/en/notLowerCased', { recursive: true });
  });

  it('Should error if there is an invalid filetype in dist', function () {
    fs.writeFileSync('dist/embeds/en/chart/badfile.shp', 'zzz');
    try {
      const graphicsPublisher = new GraphicsPublisher();
      graphicsPublisher.validateBuiltFiles();
      expect(false).to.be(true);
    } catch (e) {
      expect(e.name).to.be('InvalidFileTypeError');
      expect(e.message).to.contain(
        "Found invalid file types in this project's built files."
      );
    }
  });
});
