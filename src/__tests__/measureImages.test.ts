import * as url from 'url';

import { GraphicsPublisher } from '..';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import imgSize from 'image-size';
import mock from 'mock-fs';
import path from 'path';
import { promisify } from 'util';
import prompts from 'prompts';
import sinon from 'sinon';
import type { ISizeCalculationResult } from 'image-size/dist/types/interface';
import {
  contentEn,
  graphicsProfile,
  mediaAssets,
  nodeModules,
  packageJson,
} from './utils/mockFs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const asyncImgSize = promisify(imgSize) as (
  img: string
) => Promise<ISizeCalculationResult>;

beforeEach(() => {
  mock(
    {
      ...graphicsProfile,
      ...contentEn,
      ...nodeModules,
      ...packageJson,
      ...mediaAssets,
      'src/statics/images/share.jpg': mock.load(
        path.resolve(__dirname, 'img.jpg')
      ),
      'src/statics/images/oversize.jpg': mock.load(
        path.resolve(__dirname, 'oversize.jpg')
      ),
      'src/statics/images/oversize.png': mock.load(
        path.resolve(__dirname, 'oversize.png')
      ),
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
  sinon.restore();
});

describe('GraphicsKitPublisher measures images', () => {
  it('Should optimise an image', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        quality: 70,
        option: 'optimise',
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const sizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const resizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    expect(resizeJPG).toBeLessThan(sizeJPG);
    expect(resizePNG).toBeLessThan(sizePNG);
  });

  it('Should resize an image', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        resizeWidth: 1200,
        option: 'resize',
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const sizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const resizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    expect(resizeJPG).toBeLessThan(sizeJPG);
    expect(resizePNG).toBeLessThan(sizePNG);
  });

  it('Should optimise an image in bulk', async function () {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'all',
        quality: 60,
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    const sizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const sizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    await graphicsPublisher.measureImages();

    const resizeJPG = Math.ceil(
      fs.statSync('src/statics/images/oversize.jpg').size / 1024
    );
    const resizePNG = Math.ceil(
      fs.statSync('src/statics/images/oversize.png').size / 1024
    );

    expect(resizeJPG).toBeLessThan(sizeJPG);
    expect(resizePNG).toBeLessThan(sizePNG);
  });

  it('Should resize and optimise an image', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        resizeWidth: 1200,
        quality: 70,
        option: 'both',
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();
    const { width: widthJPG } = await asyncImgSize(
      'src/statics/images/oversize.jpg'
    );
    expect(widthJPG).toBe(1200);
    const { width: widthPNG } = await asyncImgSize(
      'src/statics/images/oversize.png'
    );
    expect(widthPNG).toBe(1200);
  });

  it('Should skip an image if previously declined to optimize', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        option: null,
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    const { width: ogWidth } = await asyncImgSize(
      'src/statics/images/oversize.jpg'
    );

    await graphicsPublisher.measureImages();
    sinon.restore();

    const fake2 = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        resizeWidth: 100,
        option: 'resize',
      })
    );
    sinon.replace(prompts, 'prompt', fake2);

    await graphicsPublisher.measureImages();

    const { width: newWidth } = await asyncImgSize(
      'src/statics/images/oversize.jpg'
    );

    expect(ogWidth).toBe(newWidth);

    const manifest = JSON.parse(
      fs.readFileSync('src/statics/images/manifest.json', 'utf8')
    );

    expect(manifest['oversize.jpg'].optimised).toBe(false);
    expect(manifest['oversize.png'].optimised).toBe(false);
    expect(manifest['share.jpg'].optimised).toBeUndefined();
  });

  it('Should write an image manifest', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        option: null,
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(
      fs.readFileSync('src/statics/images/manifest.json', 'utf8')
    );

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

  it('Should update an image manifest after resize', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        resizeWidth: 1200,
        option: 'resize',
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(
      fs.readFileSync('src/statics/images/manifest.json', 'utf8')
    );

    expect(manifest['oversize.jpg']).to.eql({
      width: 1200,
      height: 900,
      size: 53,
      optimised: false,
    });
    // Size is finicky between node versions for this png...
    expect(manifest['oversize.png'].width).to.eql(1200);
    expect(manifest['share.jpg']).to.eql({
      width: 2400,
      height: 1350,
      size: 80,
    });
  });

  it('Should not prompt for an image if user does not want to optimise', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        confirm: false,
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(
      fs.readFileSync('src/statics/images/manifest.json', 'utf8')
    );

    expect(manifest['oversize.jpg'].width).toBe(2240);
  });

  it('Should not prompt for an image if in serverless environment', async () => {
    process.env.GRAPHICS_SERVER_USERNAME = 'tk';
    process.env.GRAPHICS_SERVER_PASSWORD = 'tk';
    process.env.GRAPHICS_SERVER_API_KEY = 'tk';
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'each',
        resizeWidth: 1200,
        option: 'resize',
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    await graphicsPublisher.measureImages();

    const manifest = JSON.parse(
      fs.readFileSync('src/statics/images/manifest.json', 'utf8')
    );

    expect(manifest['oversize.jpg'].width).toBe(2240);

    delete process.env.GRAPHICS_SERVER_USERNAME;
    delete process.env.GRAPHICS_SERVER_PASSWORD;
    delete process.env.GRAPHICS_SERVER_API_KEY;
  });

  it('Speed test with an image', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    const fake = sinon.fake.returns(
      Promise.resolve({
        operation: 'all',
        quality: 70,
      })
    );
    sinon.replace(prompts, 'prompt', fake);

    for (const i of [...Array(100).keys()]) {
      fs.copyFileSync(
        'src/statics/images/oversize.jpg',
        `src/statics/images/oversize-img-${i}.jpg`
      );
    }

    const start = new Date().getTime();

    await graphicsPublisher.measureImages();

    const timeElapsed = (new Date().getTime() - start) / 1000;
    expect(timeElapsed).toBeLessThan(60);
  });
}, 200_000);
