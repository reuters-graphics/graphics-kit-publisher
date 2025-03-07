import { PREVIEW_ORIGIN } from '../../constants/preview';
import cryptoRandomString from 'crypto-random-string';
import { PKG } from '../../pkg';

/**
 * Gets preview URL from package.json. Sets a random URL if one hasn't been set yet.
 */
export const getPreviewURL = () => {
  const preview = PKG.preview;
  if (preview) return preview;
  const hash = cryptoRandomString({ length: 12, type: 'url-safe' }).replace(
    /[^A-Za-z0-9]/g,
    ''
  );
  const url = `${PREVIEW_ORIGIN}/testfiles/${new Date().getFullYear()}/${hash}/`;
  PKG.preview = url;
  return url;
};
