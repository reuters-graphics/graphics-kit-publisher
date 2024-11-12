import * as url from 'url';

import { GraphicsPublisher } from '..';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import mock from 'mock-fs';
import path from 'path';
import prompts from 'prompts';
import sinon from 'sinon';
import {
  contentEn,
  graphicsProfile,
  mediaAssets,
  nodeModules,
} from './utils/mockFs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

let PKG: {
  reuters: {
    contact: {
      name?: string;
      email?: string;
    };
    graphic: {
      desk?: string;
      slugs: {
        root?: string;
        wild?: string;
      };
      authors: { name: string; link: string }[];
      published?: string;
    };
  };
  homepage: string;
};

beforeEach(() => {
  mock(
    {
      ...graphicsProfile,
      ...nodeModules,
      ...contentEn,
      ...mediaAssets,
      'src/statics/images/share.jpg': mock.load(
        path.resolve(__dirname, 'img.jpg')
      ),
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

afterEach(() => {
  mock.restore();
  sinon.restore();
});

describe('GraphicsKitPublisher prepacks project', () => {
  it('Should set updated date in serverless', async () => {
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
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.updated).not.toBeUndefined();
    expect(new Date(pkg.reuters.graphic.updated)).toBeInstanceOf(Date);
    expect(new Date(pkg.reuters.graphic.updated).getTime()).toBeGreaterThan(
      pubDate.getTime()
    );
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should not set updated date in serverless if homepage not set', async () => {
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
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.updated).toBeUndefined();
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should not set updated date in serverless if published date is in the future', async () => {
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
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.updated).toBeUndefined();
    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Should ask to set updated date', async () => {
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
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.updated).not.toBeUndefined();
    expect(new Date(pkg.reuters.graphic.updated)).toBeInstanceOf(Date);
  });

  it('Should ask for missing contact name', async () => {
    delete PKG.reuters.contact.name;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.contact.name': 'Jon' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.contact.name).toBe('Jon');
  });

  it('Should ask for missing contact email', async () => {
    delete PKG.reuters.contact.email;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.contact.email': 'jon@gmail.com' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.contact.email).toBe('jon@gmail.com');
  });

  it('Should ask for missing desk', async () => {
    delete PKG.reuters.graphic.desk;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.desk': 'london' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.desk).toBe('london');
  });

  it('Should ask for missing root slug', async () => {
    delete PKG.reuters.graphic.slugs.root;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.slugs.root': 'NEW ZEALAND-WEATHER' })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.slugs.root).toBe('NEW ZEALAND-WEATHER');
  });

  it('Should ask for publish date', async () => {
    delete PKG.reuters.graphic.published;
    fs.writeFileSync('package.json', JSON.stringify(PKG));
    const now = new Date().toISOString();
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({ 'reuters.graphic.published': now })
    );
    sinon.replace(prompts, 'prompt', fake);
    await graphicsPublisher.getPackMetadata();
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(pkg.reuters.graphic.published).toBe(now);
  });
}, 20_000);
