import * as url from 'url';

import { GraphicsPublisher } from '../dist/index.js';
import expect from 'expect.js';
import fs from 'fs';
import mock from 'mock-fs';
import os from 'os';
import path from 'path';
import prompts from 'prompts';
import sinon from 'sinon';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let PKG;

describe('GraphicsKitPublisher prepacks project', function () {
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
    PKG = {
      reuters: {
        contact: {
          name: 'Jon',
          email: 'j@gmail.com',
        },
        graphic: {
          desk: 'london',
          slugs: {
            root: 'HEALTH-CORONAVIRUS',
            wild: '',
          },
          authors: [{ name: 'Jon', link: 'https://jm.co' }],
          published: new Date().toISOString(),
        },
      },
      homepage: 'https://www.google.com',
    };
  });

  afterEach(function () {
    mock.restore();
    sinon.restore();
  });

  it('Should set updated date in serverless', async function () {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const pubDate = new Date();
    pubDate.setDate(pubDate.getDate() - 1);
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        reuters: {
          graphic: {
            published: pubDate.toISOString(),
          },
        },
        homepage: 'https://www.google.com',
      })
    );
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).not.to.be(undefined);
    expect(new Date(pkg.reuters.graphic.updated)).to.be.an(Date);
    expect(new Date(pkg.reuters.graphic.updated)).to.be.greaterThan(pubDate);
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should not set updated date in serverless if homepage not set', async function () {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        reuters: {
          graphic: {
            published: new Date().toISOString(),
          },
        },
      })
    );
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).to.be(undefined);
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should not set updated date in serverless if published date is in the future', async function () {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const pubDate = new Date();
    pubDate.setDate(pubDate.getDate() + 1);
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        reuters: {
          graphic: {
            published: pubDate.toISOString(),
          },
        },
        homepage: 'https://www.google.com',
      })
    );
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).to.be(undefined);
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should ask to set updated date', async function () {
    const pubDate = new Date();
    pubDate.setDate(pubDate.getDate() - 1);
    fs.writeFileSync(
      'package.json',
      JSON.stringify({
        reuters: {
          graphic: {
            published: pubDate.toISOString(),
          },
        },
        homepage: 'https://www.google.com',
      })
    );
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(Promise.resolve({ confirm: true }));
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.setUpdatedTime();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.updated).not.to.be(undefined);
    expect(new Date(pkg.reuters.graphic.updated)).to.be.an(Date);
  });

  it('Should ask for missing contact name', async function () {
    delete PKG.reuters.contact.name;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.contact.name': 'Jon' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.contact.name).to.be('Jon');
  });

  it('Should ask for missing contact email', async function () {
    delete PKG.reuters.contact.email;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.contact.email': 'jon@gmail.com' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.contact.email).to.be('jon@gmail.com');
  });

  it('Should ask for missing desk', async function () {
    delete PKG.reuters.graphic.desk;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.desk': 'london' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.desk).to.be('london');
  });

  it('Should ask for missing root slug', async function () {
    delete PKG.reuters.graphic.slugs.root;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.slugs.root': 'NEW ZEALAND-WEATHER' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.slugs.root).to.be('NEW ZEALAND-WEATHER');
  });

  it('Should ask for publish date', async function () {
    delete PKG.reuters.graphic.published;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const now = new Date().toISOString();
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.published': now })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json'));
    expect(pkg.reuters.graphic.published).to.be(now);
  });
});
