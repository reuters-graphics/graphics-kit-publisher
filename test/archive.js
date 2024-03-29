import * as url from 'url';

import { GraphicsPublisher } from '../dist/index.js';
import expect from 'expect.js';
import fs from 'fs';
import mock from 'mock-fs';
import os from 'os';
import path from 'path';
import unzipper from 'unzipper';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

describe('GraphicsKitPublisher archives src files', function () {
  this.timeout(30000);

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
        'locales/en/content.json': JSON.stringify({
          SEOTitle: 'title',
          SEODescription: 'description',
        }),
        node_modules: mock.load(path.resolve(__dirname, '../node_modules')),
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
        'package.json': JSON.stringify({
          scripts: { build: '' },
          homepage: 'https://www.reuters.com/graphics/project/',
        }),
        'graphics-pack': {
          '_app.zip': mock.load(path.resolve(__dirname, '_app.zip')),
        },
      },
      { createCwd: false }
    );
  });

  afterEach(function () {
    mock.restore();
  });

  it('Should create src archive', async function () {
    const graphicsPublisher = new GraphicsPublisher();
    await graphicsPublisher.makeSrcArchive(true);

    expect(fs.existsSync('graphics-pack/app.zip')).to.be(true);

    await new Promise((resolve) => {
      fs.createReadStream('graphics-pack/app.zip').pipe(
        unzipper.Extract({ path: 'graphics-pack' }).on('close', resolve)
      );
    });
    // _app.zip is the output of this projects git archive
    expect(fs.existsSync('graphics-pack/app/README.md')).to.be(true);
  });
});
