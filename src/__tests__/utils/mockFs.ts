import * as url from 'url';
import path from 'path';
import os from 'os';
import mock from 'mock-fs';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export const graphicsProfile = {
  [path.join(os.homedir(), '.reuters-graphics/profile.json')]: JSON.stringify({
    name: 'Graphics Staff',
    email: 'all.graphics@thomsonreuters.com',
    url: 'https://www.reuters.com',
    desk: 'london',
  }),
};

export const contentEn = {
  'locales/en/content.json': JSON.stringify({
    SEOTitle: 'title',
    SEODescription: 'description',
  }),
};

export const nodeModules = {
  node_modules: mock.load(path.resolve(__dirname, '../../../node_modules')),
};

export const packageJson = {
  'package.json': JSON.stringify({
    scripts: { build: '' },
    homepage: 'https://www.reuters.com/graphics/project/',
  }),
};

export const graphicsPack = {
  'graphics-pack': {
    '_app.zip': mock.load(path.resolve(__dirname, '../_app.zip')),
  },
};

export const mediaAssets = {
  'media-assets': {},
};
