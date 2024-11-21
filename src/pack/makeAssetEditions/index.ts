import type { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';

const makeAssetImages = async (config: ConfigType) => {
  const assetLocales = glob.sync('*/', { cwd: config.ASSETS_DIR });

  for (const assetLocale of assetLocales) {
    const locale = assetLocale.replace('/', '');
    const ASSET_LOCALE_DIR = path.join(config.ASSETS_DIR, locale);
    const embeds = glob.sync('*/', { cwd: ASSET_LOCALE_DIR });
    for (const embed of embeds) {
      const embedSlug = slugify(embed.replace('/', ''));
      const embedEditionSlug = `media-${locale}-${embedSlug}`;
      const EMBED_EDITION_DIR = path.join(config.PACK_DIR, embedEditionSlug);
      const JPG = glob.sync('*.jpg', {
        cwd: path.join(ASSET_LOCALE_DIR, embed),
      })[0];
      const JPG_PATH = path.join(config.ASSETS_DIR, locale, embed, JPG);
      const JPG_EDITION_DIR = path.join(EMBED_EDITION_DIR, 'JPG');
      fs.ensureDirSync(JPG_EDITION_DIR);
      fs.copyFileSync(JPG_PATH, path.join(JPG_EDITION_DIR, JPG));
      const MEDIA_EDITION = path.join(EMBED_EDITION_DIR, 'media-interactive');
      if (!fs.existsSync(MEDIA_EDITION)) continue;
      const previewImgBuffer = await sharp(fs.readFileSync(JPG_PATH))
        .png()
        .toBuffer();
      fs.writeFileSync(
        path.join(EMBED_EDITION_DIR, 'media-interactive', '_gfxpreview.png'),
        previewImgBuffer
      );
    }
  }
};

const makeAssetEPSs = async (config: ConfigType) => {
  const assetLocales = glob.sync('*/', { cwd: config.ASSETS_DIR });

  for (const assetLocale of assetLocales) {
    const locale = assetLocale.replace('/', '');
    const ASSET_LOCALE_DIR = path.join(config.ASSETS_DIR, locale);
    const embeds = glob.sync('*/', { cwd: ASSET_LOCALE_DIR });
    for (const embed of embeds) {
      const embedSlug = slugify(embed.replace('/', ''));
      const embedEditionSlug = `media-${locale}-${embedSlug}`;
      const EMBED_EDITION_DIR = path.join(config.PACK_DIR, embedEditionSlug);
      const JPG = glob.sync('*.jpg', {
        cwd: path.join(ASSET_LOCALE_DIR, embed),
      })[0];
      const JPG_PATH = path.join(config.ASSETS_DIR, locale, embed, JPG);
      const EPS = glob.sync('*.eps', {
        cwd: path.join(ASSET_LOCALE_DIR, embed),
      })[0];
      if (!EPS) continue;
      const EPS_PATH = path.join(config.ASSETS_DIR, locale, embed, EPS);
      const EPS_EDITION_DIR = path.join(EMBED_EDITION_DIR, 'EPS');
      fs.ensureDirSync(EPS_EDITION_DIR);
      fs.copyFileSync(EPS_PATH, path.join(EPS_EDITION_DIR, EPS));
      fs.copyFileSync(JPG_PATH, path.join(EPS_EDITION_DIR, JPG));
    }
  }
};

export default async (config: ConfigType) => {
  await makeAssetImages(config);
  await makeAssetEPSs(config);
};
