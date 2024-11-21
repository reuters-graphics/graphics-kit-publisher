import * as url from 'url';

import { GraphicsPublisher } from '..';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import fs from 'fs';
import mock from 'mock-fs';
import path from 'path';
import {
  contentEn,
  graphicsProfile,
  mediaAssets,
  nodeModules,
} from './utils/mockFs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

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
});

afterEach(() => {
  mock.restore();
});

describe('GraphicsKitPublisher validates built files', () => {
  it('Should verify dist directory successfully', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    try {
      graphicsPublisher.validateBuiltFiles();
      expect(true).toBe(true);
    } catch {
      expect(false).toBe(true);
    }
  });

  it('Should error if dist/index.html does not exist', () => {
    fs.rmSync('dist/index.html');

    const graphicsPublisher = new GraphicsPublisher();
    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      chalk`Did not find an {cyan index.html} file in {yellow dist}.`
    );
  });

  it('Should error if invalid locale directory in embeds', () => {
    fs.mkdirSync('dist/embeds/zz', { recursive: true });
    const graphicsPublisher = new GraphicsPublisher();
    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      'Invalid directory in embeds'
    );
  });

  it('Should error if valid locale directory in embeds has no index.html', () => {
    fs.mkdirSync('dist/embeds/es/chart', { recursive: true });
    const graphicsPublisher = new GraphicsPublisher();
    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      chalk`Did not find an {cyan index.html} file`
    );
  });

  it('Should error if embed page is not slugified', () => {
    fs.mkdirSync('dist/embeds/en/not_slugged', { recursive: true });
    fs.writeFileSync('dist/embeds/en/not_slugged/index.html', 'zzz');
    const graphicsPublisher = new GraphicsPublisher();
    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      chalk`Embed pages should be slugified. Maybe rename {cyan embeds/en/not_slugged} to {green embeds/en/not-slugged}?`
    );

    fs.rmSync('dist/embeds/en/not_slugged', { recursive: true });

    fs.mkdirSync('dist/embeds/en/notLowerCased', { recursive: true });
    fs.writeFileSync('dist/embeds/en/notLowerCased/index.html', 'zzz');

    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      chalk`Embed pages should be slugified. Maybe rename {cyan embeds/en/notLowerCased} to {green embeds/en/notlowercased}?`
    );
    fs.rmSync('dist/embeds/en/notLowerCased', { recursive: true });
  });

  it('Should error if there is an invalid filetype in dist', () => {
    fs.writeFileSync('dist/embeds/en/chart/badfile.shp', 'zzz');

    const graphicsPublisher = new GraphicsPublisher();
    expect(() => graphicsPublisher.validateBuiltFiles()).toThrowError(
      "Found invalid file types in this project's built files."
    );
  });
}, 20_000);
