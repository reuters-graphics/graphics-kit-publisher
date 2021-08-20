import { FileNotFoundError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getLocalPageMetadata from '../../utils/getLocalPageMetadata';
import glob from 'glob';
import path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import url from 'url';

export default {
  async makePreviewImages() {
    const INDEX = path.join(this.DIST_DIR, 'index.html');
    const metadata = await getLocalPageMetadata(INDEX);
    const { ogImage: shareImage } = metadata;
    if (!shareImage) {
      throw new FileNotFoundError(chalk`No share image found in metadata for {yellow ${path.relative(this.CWD, path.join(this.DIST_DIR, 'index.html'))}}`);
    }
    const ROOT_RELATIVE_PATH = new url.URL(this.homepage).pathname;
    const SHARE_IMAGE_PATH = path.join(this.DIST_DIR, shareImage.url.replace(this.homepage, '').replace(ROOT_RELATIVE_PATH, ''));
    if (!fs.existsSync(SHARE_IMAGE_PATH)) {
      throw new FileNotFoundError(chalk`Could not find local copy of share image {yellow ${path.relative(this.CWD, SHARE_IMAGE_PATH)}}`);
    }

    const EMBEDS_DIR = path.join(this.DIST_DIR, 'embeds');
    const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

    for (const embedLocale of embedLocales) {
      const locale = embedLocale.replace('/', '');
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
      for (const embed of embeds) {
        const embedSlug = `media-${locale}-${slugify(path.dirname(embed))}`;
        const EMBED_MEDIA_DIR = path.join(this.PACK_DIR, embedSlug, 'media-interactive');
        // Check if embed has a share image.
        const { ogImage: shareImage } = await getLocalPageMetadata(path.join(LOCALE_DIR, embed));
        if (shareImage) {
          const EMBED_SHARE_IMAGE_PATH = path.join(this.DIST_DIR, shareImage.url.replace(ROOT_RELATIVE_PATH, ''));
          // ... and if we can find that image, use it.
          if (fs.existsSync(EMBED_SHARE_IMAGE_PATH)) {
            const previewImgBuffer = await sharp(EMBED_SHARE_IMAGE_PATH)
              .png()
              .toBuffer();
            fs.writeFileSync(path.join(EMBED_MEDIA_DIR, '_gfxpreview.png'), previewImgBuffer);
            continue;
          }
        }
        // Otherwise, we'll use the share image from the root index page
        const previewImgBuffer = await sharp(SHARE_IMAGE_PATH)
          .png()
          .toBuffer();
        fs.writeFileSync(path.join(EMBED_MEDIA_DIR, '_gfxpreview.png'), previewImgBuffer);
      }
    }
  },
};
