import { getLocalHTMLPageMetadata } from './getLocalPageMetadata';
import url from 'url';
import path from 'path';
import fs from 'fs';
import {
  FileNotFoundError,
  InvalidFileTypeError,
  PageMetadataError,
} from '../../../exceptions/errors';

const VALID_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.gif'];

/**
 * Get the local file system path to a preview image for an HTML page.
 *
 * The preview image must be either;
 * 1. Named `_gfxpreview.png` or `_gfxpreview.jpg` and be directly next to the HTML page on the file system.
 * 2. Referenced in the HTML code through an og:image tag.
 *
 * **Note:** If referenced through an og:image tag, the page must also include a canonical URL metatag.
 *
 * @param htmlPath Path to the HTML file on the filesystem
 * @returns path to preview image
 */
export const getPreviewImagePath = async (htmlPath: string) => {
  // Check for local preview images first ...
  const localPreviewPNG = path.join(path.dirname(htmlPath), '_gfxpreview.png');
  const localPreviewJPG = path.join(path.dirname(htmlPath), '_gfxpreview.jpg');
  if (fs.existsSync(localPreviewPNG)) return localPreviewPNG;
  if (fs.existsSync(localPreviewJPG)) return localPreviewJPG;

  const { ogUrl, ogImage } = await getLocalHTMLPageMetadata(htmlPath);

  if (!ogImage)
    throw new PageMetadataError(`No "og:image" tag found in ${htmlPath}`, {
      code: 'MISSING_OG_IMAGE',
      hint: 'Add an <meta property="og:image"> tag to the page.',
      context: { htmlPath },
    });
  if (!ogUrl)
    throw new PageMetadataError(`No canonical link found in ${htmlPath}`, {
      code: 'MISSING_CANONICAL_LINK',
      hint: 'Add a <link rel="canonical"> tag to the page.',
      context: { htmlPath },
    });

  const imgUrl = ogImage[0].url;

  // e.g., "/graphics/2025/my-project/"
  const rootRelativePathOfPage = new url.URL(ogUrl).pathname.replace(
    'index.html',
    ''
  );
  // e.g., "/graphics/2025/my-project/cdn/assets/img/my-image.jpg"
  const rootRelativePathOfImg = new url.URL(imgUrl).pathname;

  // e.g., "cdn/assets/img/my-image.jpg"
  const relativePathToImage = path.relative(
    rootRelativePathOfPage,
    rootRelativePathOfImg
  );

  // e.g., "dist/cdn/assets/img/my-image.jpg"
  const pathToPreviewImage = path.join(
    path.dirname(htmlPath),
    relativePathToImage
  );

  if (!VALID_IMAGE_FORMATS.includes(path.extname(pathToPreviewImage)))
    throw new InvalidFileTypeError(
      `Invalid preview image type: ${path.basename(pathToPreviewImage)}`,
      {
        code: 'INVALID_PREVIEW_IMAGE_TYPE',
        hint: 'Use a supported preview image format.',
        context: {
          previewImage: pathToPreviewImage,
          allowed: VALID_IMAGE_FORMATS,
        },
      }
    );

  if (!fs.existsSync(pathToPreviewImage))
    throw new FileNotFoundError(
      `Preview image detected in metadata but not found: ${pathToPreviewImage}`,
      {
        code: 'PREVIEW_IMAGE_NOT_FOUND',
        hint: 'Ensure the og:image referenced in your HTML exists in the build output.',
        context: { previewImage: pathToPreviewImage, htmlPath },
      }
    );
  return pathToPreviewImage;
};
