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
      ...contentEn,
      ...nodeModules,
      ...mediaAssets,
      'src/statics/images/share.jpg': mock.load(
        path.resolve(__dirname, 'img.jpg')
      ),
      'package.json': JSON.stringify({ scripts: { build: '' } }),
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
});

describe('GraphicsKitPublisher validates source files', () => {
  it('Should verify startup directories', () => {
    try {
      const graphicsPublisher = new GraphicsPublisher();
      // This is actually called in the constructor, but here for good measure...
      graphicsPublisher.validateSourceFiles();
      expect(true).toBe(true);
    } catch {
      expect(false).toBe(true);
    }
  });

  it('Should error if imagesDir does not exist', () => {
    fs.rmSync('src/statics/images/', { recursive: true });
    expect(() => new GraphicsPublisher()).toThrowError(
      'Directory for images not found'
    );
  });

  it('Should error if assetsDir does not exist', function () {
    fs.rmSync('media-assets', { recursive: true });
    expect(() => new GraphicsPublisher()).toThrowError('Media assets director');
  });

  it('Should error if assetsDir has an invalid locale directory', function () {
    fs.mkdirSync('media-assets/zz/');
    expect(() => new GraphicsPublisher()).toThrowError(
      'Invalid directory in media assets'
    );
  });

  it('Should error if valid locale in assetsDir has no jpg', function () {
    fs.mkdirSync('media-assets/en/chart/', { recursive: true });
    expect(() => new GraphicsPublisher()).toThrowError(
      chalk`Did not find a {cyan .jpg}`
    );
  });

  it('Should error if script not run in location with a package.json', function () {
    fs.rmSync('package.json');
    expect(() => new GraphicsPublisher()).toThrowError(
      chalk`Unable to find {yellow package.json}`
    );
  });

  it('Should error if localesDir does not exist', function () {
    fs.rmSync('locales', { recursive: true });
    expect(() => new GraphicsPublisher()).toThrowError(
      chalk`Locales directory {yellow locales} does not exist.`
    );
  });

  it('Should error if localesDir has an invalid locale directory', function () {
    fs.mkdirSync('locales/zz/');
    expect(() => new GraphicsPublisher()).toThrowError(
      'Invalid directory in locales:'
    );
  });

  it('Should error if localesDir is missing default locale directory', function () {
    fs.rmSync('locales/en/', { recursive: true });
    expect(() => new GraphicsPublisher()).toThrowError(
      chalk`Locale directory for default locale {cyan en} does not exist`
    );
  });

  it('Should error if default locale directory in localesDir is missing metadata JSON', function () {
    fs.rmSync('locales/en/content.json');
    expect(() => new GraphicsPublisher()).toThrowError(
      chalk`Default metadata JSON file {cyan content.json} does not exist`
    );
  });
});
