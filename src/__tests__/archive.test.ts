import * as url from 'url';

import { GraphicsPublisher } from '..';
import { expect, describe, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import mock from 'mock-fs';
import path from 'path';
import unzipper from 'unzipper';
import {
  graphicsProfile,
  contentEn,
  nodeModules,
  packageJson,
  graphicsPack,
} from './utils/mockFs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

beforeEach(() => {
  mock(
    {
      ...graphicsProfile,
      ...contentEn,
      ...nodeModules,
      ...packageJson,
      ...graphicsPack,
      'src/statics/images/share.jpg': mock.load(
        path.resolve(__dirname, 'img.jpg')
      ),
      'media-assets': {
        en: {
          chart: {
            'chart.jpg': mock.load(path.resolve(__dirname, 'img.jpg')),
            'chart.eps': 'zzz',
          },
        },
      },
    },
    { createCwd: false }
  );
});

afterEach(() => {
  mock.restore();
});

describe('GraphicsKitPublisher archives src files', () => {
  it('Should create src archive', async () => {
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.makeSrcArchive(true);

    expect(fs.existsSync('graphics-pack/app.zip')).toBe(true);

    await new Promise((resolve) => {
      fs.createReadStream('graphics-pack/app.zip').pipe(
        unzipper.Extract({ path: 'graphics-pack' }).on('close', resolve)
      );
    });
    // _app.zip is the output of this projects git archive
    expect(fs.existsSync('graphics-pack/app/README.md')).toBe(true);
  });
}, 30_000);
