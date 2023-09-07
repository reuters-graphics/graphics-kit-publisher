import {
  FileNotFoundError,
  InvalidFileTypeError,
  PackageMetadataError,
} from '../../exceptions/errors';

import { ConfigType } from '../../setConfig';
import chalk from 'chalk';
import fs from 'fs-extra';
import { getHomepage } from '../../metadata';
import getLocalPageMetadata from '../../utils/getLocalPageMetadata';
import getPkgRoot from '../../utils/getPkgRoot';
import glob from 'glob';
import path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import url from 'url';

const VALID_SHARE_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

export default async (config: ConfigType) => {
  const cwd = getPkgRoot();
  const homepage = getHomepage();
  if (!homepage) {
    throw new PackageMetadataError('No homepage set in package.json');
  }
  const INDEX = path.join(config.DIST_DIR, 'index.html');
  const metadata = await getLocalPageMetadata(INDEX);
  const { ogImage: shareImage } = metadata;
  if (!shareImage) {
    throw new FileNotFoundError(
      chalk`No share image found in metadata for {yellow ${path.relative(
        cwd,
        path.join(config.DIST_DIR, 'index.html')
      )}}`
    );
  }
  const shareImageUrl = Array.isArray(shareImage)
    ? shareImage[0].url
    : shareImage.url;
  if (
    !VALID_SHARE_IMAGE_FORMATS.includes(
      path.extname(shareImageUrl).toLowerCase()
    )
  ) {
    throw new InvalidFileTypeError(
      chalk`Invalid share image found in metadata for {yellow ${path.relative(
        cwd,
        path.join(config.DIST_DIR, 'index.html')
      )}}. Share image was set as: {yellow ${shareImageUrl}}`
    );
  }
  const ROOT_RELATIVE_PATH = new url.URL(homepage).pathname;
  const SHARE_IMAGE_PATH = path.join(
    config.DIST_DIR,
    shareImageUrl.replace(homepage, '').replace(ROOT_RELATIVE_PATH, '')
  );
  if (!fs.existsSync(SHARE_IMAGE_PATH)) {
    throw new FileNotFoundError(
      chalk`Could not find local copy of share image {yellow ${path.relative(
        cwd,
        SHARE_IMAGE_PATH
      )}}`
    );
  }

  const INTERACTIVE_PUBLIC_DIR = path.join(
    config.PACK_DIR,
    'public/interactive'
  );

  const previewImgBuffer = await sharp(fs.readFileSync(SHARE_IMAGE_PATH))
    .png()
    .toBuffer();
  fs.writeFileSync(
    path.join(INTERACTIVE_PUBLIC_DIR, '_gfxpreview.png'),
    previewImgBuffer
  );

  const EMBEDS_DIR = path.join(config.DIST_DIR, 'embeds');
  const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

  for (const embedLocale of embedLocales) {
    const locale = embedLocale.replace('/', '');
    const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
    const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
    for (const embed of embeds) {
      const embedSlug = `media-${locale}-${slugify(path.dirname(embed))}`;
      const EMBED_MEDIA_DIR = path.join(
        config.PACK_DIR,
        embedSlug,
        'media-interactive'
      );
      const INTERACTIVE_MEDIA_DIR = path.join(
        config.PACK_DIR,
        embedSlug,
        'interactive'
      );
      // Check if embed has a share image.
      const { ogImage: shareImage } = await getLocalPageMetadata(
        path.join(LOCALE_DIR, embed)
      );
      if (shareImage) {
        const shareImageUrl = Array.isArray(shareImage)
          ? shareImage[0].url
          : shareImage.url;
        // Ensure share image is valid format
        if (
          VALID_SHARE_IMAGE_FORMATS.includes(
            path.extname(shareImageUrl).toLowerCase()
          )
        ) {
          const EMBED_SHARE_IMAGE_PATH = path.join(
            config.DIST_DIR,
            shareImageUrl.replace(homepage, '')
          );
          // ... and if we can find that image, use it.
          if (fs.existsSync(EMBED_SHARE_IMAGE_PATH)) {
            const previewImgBuffer = await sharp(
              fs.readFileSync(EMBED_SHARE_IMAGE_PATH)
            )
              .png()
              .toBuffer();
            fs.writeFileSync(
              path.join(EMBED_MEDIA_DIR, '_gfxpreview.png'),
              previewImgBuffer
            );
            fs.writeFileSync(
              path.join(INTERACTIVE_MEDIA_DIR, '_gfxpreview.png'),
              previewImgBuffer
            );
            continue;
          }
        }
      }
      // Otherwise, we'll use the share image from the root index page
      fs.writeFileSync(
        path.join(EMBED_MEDIA_DIR, '_gfxpreview.png'),
        previewImgBuffer
      );
      fs.writeFileSync(
        path.join(INTERACTIVE_MEDIA_DIR, '_gfxpreview.png'),
        previewImgBuffer
      );
    }
  }
};
