import { PREVIEW_ORIGIN } from '../../constants/preview';
import cryptoRandomString from 'crypto-random-string';
import { utils } from '@reuters-graphics/graphics-bin';

/**
 * Gets preview URL from package.json. Sets a random URL if one hasn't been set yet.
 */
export const getPreviewURL = () => {
  const { reuters } = utils.getPkg();
  const { preview } = reuters;
  if (preview) return preview;
  const hash = cryptoRandomString({ length: 12, type: 'url-safe' }).replace(
    /[^A-Za-z0-9]/g,
    ''
  );
  const url = `${PREVIEW_ORIGIN}/testfiles/${new Date().getFullYear()}/${hash}/`;
  utils.setPkgProp('reuters.preview', url);
  return url;
};
