import { FileNotFoundError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getLocalPageMetadata from '../../utils/getLocalPageMetadata';
import glob from 'glob';
import path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import url from 'url';

/**
 * Finds the image in the local static files directory that matches the social
 * share image, allowing a variable path for statics on the server.
 * @param {string} shareImgPath Path to share image relative to project root
 * @param {string} STATIC_IMGS_DIR Path to local static images directory
 * @returns {string} local image path
 */
const findLocalShareImage = (shareImgPath, STATIC_IMGS_DIR) => {
  const manifest = fs.readJSONSync(path.join(STATIC_IMGS_DIR, 'manifest.json'));
  const imageNames = Object.keys(manifest);
  imageNames.sort((a, b) => a.length - b.length);
  for (const imageName of imageNames) {
    if (shareImgPath.replace(/^\//, '').includes(imageName)) return path.join(STATIC_IMGS_DIR, imageName);
  }
};

export default {
  async makePreviewImages() {
    const INDEX = path.join(this.DIST_DIR, 'index.html');
    const metadata = await getLocalPageMetadata(INDEX, this.homepage);
    const { ogImage: shareImage } = metadata;
    if (!shareImage) {
      throw new FileNotFoundError(chalk`No share image found in metadata for {yellow ${path.relative(this.CWD, path.join(this.DIST_DIR, 'index.html'))}}`);
    }
    const ROOT_RELATIVE_PATH = new url.URL(this.homepage).pathname;
    const SHARE_IMAGE_PATH = path.join(this.DIST_DIR, shareImage.url.replace(ROOT_RELATIVE_PATH, ''));
    const LOCAL_SHARE_IMAGE_PATH = findLocalShareImage(SHARE_IMAGE_PATH, this.STATIC_IMGS_DIR);

    const EMBEDS_DIR = path.join(this.DIST_DIR, 'embeds');
    const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

    for (const embedLocale of embedLocales) {
      const locale = embedLocale.replace('/', '');
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
      for (const embed of embeds) {
        const embedSlug = `media-${locale}-${slugify(path.dirname(embed))}`;
        const EMBED_DIR = path.join(this.PACK_DIR, embedSlug, 'media-interactive');
        const previewImgBuffer = await sharp(LOCAL_SHARE_IMAGE_PATH)
          .png()
          .toBuffer();
        fs.writeFileSync(path.join(EMBED_DIR, '_gfxpreview.png'), previewImgBuffer);
      }
    }
  },
};
