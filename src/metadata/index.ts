import { PackageMetadataError } from '../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../utils/getPkg';
import { graphicIdRegex } from '../constants/metadata';
import url from 'url';
import { validHomepageHostnames } from '../constants/homepage';

export const getPackId = () => {
  const { reuters } = getPkg();
  const { pack } = reuters.graphic;
  if (!pack) return null;
  if (!graphicIdRegex.test(pack)) {
    throw new PackageMetadataError(
      chalk`Invalid {yellow reuters.graphic.packId} in {cyan package.json}`
    );
  }
  return pack;
};

export const getHomepage = () => {
  const { homepage } = getPkg();
  if (!homepage) return null;
  const homepageUrl = new url.URL(homepage);
  if (!validHomepageHostnames.includes(homepageUrl.hostname)) {
    throw new PackageMetadataError(
      chalk`Invalid {yellow homepage} in {cyan package.json} with hostname: {yellow ${homepageUrl.hostname}}`
    );
  }
  return homepage;
};
