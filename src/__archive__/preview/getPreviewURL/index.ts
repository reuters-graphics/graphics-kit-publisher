import { PREVIEW_ORIGIN } from '../../constants/preview';
import cryptoRandomString from 'crypto-random-string';
import getPkg from '../../utils/getPkg';
import setPkgProp from '../../utils/setPkgProp';

/**
 * Gets preview URL from package.json. Sets a random URL if one hasn't been set yet.
 */
export default () => {
  const { reuters } = getPkg();
  const { preview } = reuters;
  if (preview) return preview;
  const hash = cryptoRandomString({ length: 12, type: 'url-safe' }).replace(
    /[^A-Za-z0-9]/g,
    ''
  );
  const URL = `${PREVIEW_ORIGIN}/testfiles/${new Date().getFullYear()}/${hash}/`;
  setPkgProp('reuters.preview', URL);
  return URL;
};
