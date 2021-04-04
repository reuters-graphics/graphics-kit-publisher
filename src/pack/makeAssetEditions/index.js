import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';

export default {
  async makeAssetImages() {
    const assetLocales = glob.sync('*/', { cwd: this.ASSETS_DIR });

    for (const assetLocale of assetLocales) {
      const locale = assetLocale.replace('/', '');
      const ASSET_LOCALE_DIR = path.join(this.ASSETS_DIR, locale);
      const embeds = glob.sync('*/', { cwd: ASSET_LOCALE_DIR });
      for (const embed of embeds) {
        const embedSlug = slugify(embed.replace('/', ''));
        const embedEditionSlug = `media-${locale}-${embedSlug}`;
        const EMBED_EDITION_DIR = path.join(this.PACK_DIR, embedEditionSlug);
        const JPG = glob.sync('*.jpg', { cwd: path.join(ASSET_LOCALE_DIR, embed) })[0];
        const JPG_PATH = path.join(this.ASSETS_DIR, locale, embed, JPG);
        const JPG_EDITION_DIR = path.join(EMBED_EDITION_DIR, 'JPG');
        fs.ensureDirSync(JPG_EDITION_DIR);
        fs.copyFileSync(
          JPG_PATH,
          path.join(JPG_EDITION_DIR, JPG)
        );
        const MEDIA_EDITION = path.join(EMBED_EDITION_DIR, 'media-interactive');
        if (!fs.existsSync(MEDIA_EDITION)) continue;
        const previewImgBuffer = await sharp(JPG_PATH)
          .png()
          .toBuffer();
        fs.writeFileSync(path.join(EMBED_EDITION_DIR, 'media-interactive', '_gfxpreview.png'), previewImgBuffer);
      }
    }
  },
  async makeAssetEPSs() {
    const assetLocales = glob.sync('*/', { cwd: this.ASSETS_DIR });

    for (const assetLocale of assetLocales) {
      const locale = assetLocale.replace('/', '');
      const ASSET_LOCALE_DIR = path.join(this.ASSETS_DIR, locale);
      const embeds = glob.sync('*/', { cwd: ASSET_LOCALE_DIR });
      for (const embed of embeds) {
        const embedSlug = slugify(embed.replace('/', ''));
        const embedEditionSlug = `media-${locale}-${embedSlug}`;
        const EMBED_EDITION_DIR = path.join(this.PACK_DIR, embedEditionSlug);
        const JPG = glob.sync('*.jpg', { cwd: path.join(ASSET_LOCALE_DIR, embed) })[0];
        const JPG_PATH = path.join(this.ASSETS_DIR, locale, embed, JPG);
        const EPS = glob.sync('*.eps', { cwd: path.join(ASSET_LOCALE_DIR, embed) })[0];
        if (!EPS) continue;
        const EPS_PATH = path.join(this.ASSETS_DIR, locale, embed, EPS);
        const EPS_EDITION_DIR = path.join(EMBED_EDITION_DIR, 'EPS');
        fs.ensureDirSync(EPS_EDITION_DIR);
        fs.copyFileSync(
          EPS_PATH,
          path.join(EPS_EDITION_DIR, EPS)
        );
        fs.copyFileSync(
          JPG_PATH,
          path.join(EPS_EDITION_DIR, JPG)
        );
      }
    }
  },
  async makeAssetEditions() {
    await this.makeAssetImages();
    await this.makeAssetEPSs();
  },
};
