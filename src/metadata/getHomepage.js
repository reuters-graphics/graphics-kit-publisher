import { PackageMetadataError } from '../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../utils/getPkg';
import url from 'url';
import { validHomepageHostnames } from '../constants/homepage';

export default {
  getHomepage() {
    const { homepage } = getPkg();
    if (!homepage) return null;
    const homepageUrl = new url.URL(homepage);
    if (!validHomepageHostnames.includes(homepageUrl.hostname)) throw new PackageMetadataError(chalk`Invalid {yellow homepage} in {cyan package.json} with hostname: {yellow ${homepageUrl.hostname}}`);
    this.homepage = homepage;
  },
};
