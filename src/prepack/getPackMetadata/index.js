import { PackageMetadataError } from '../../exceptions/errors';
import askJSON from 'ask-json';
import chalk from 'chalk';
import fs from 'fs-extra';
import get from 'lodash/get';
import getPkg from '../../utils/getPkg';
import isServerless from '../../utils/isServerless';
import packageSchema from './schemas/package';
import path from 'path';
import prompts from 'prompts';

export default {
  async setUpdatedTime() {
    const packageJson = getPkg();
    // If homepage isn't set, then we haven't published yet.
    if (!packageJson.homepage) return;
    // If published time is in the future, don't set an updated time.
    if (new Date(packageJson.reuters.graphic.published) >= new Date()) return;
    // Always set the updated time in serverless environment...
    if (isServerless()) {
      packageJson.reuters.graphic.updated = new Date().toISOString();
    // ... otherwise ask.
    } else {
      const { confirm } = await prompts({
        type: 'confirm',
        name: 'confirm',
        message: packageJson.reuters.graphic.updated ?
          'Should we reset the updated time?' : 'Should we set the updated time?',
        initial: true,
      });
      if (!confirm) return;
      packageJson.reuters.graphic.updated = new Date().toISOString();
    }
    fs.writeFileSync(path.join(this.CWD, 'package.json'), JSON.stringify(packageJson, null, 2));
  },
  async getPackageMetadata() {
    const packageJson = getPkg();
    const validPackageJson = await askJSON(packageSchema, packageJson, { askToAddItems: !isServerless() });
    fs.writeFileSync(path.join(this.CWD, 'package.json'), JSON.stringify(validPackageJson, null, 2));
    await this.setUpdatedTime();
    return validPackageJson.reuters;
  },
  async getDefaultLocaleMetadata() {
    const defaultLocaleMetadatafile = fs.readJSONSync(this.PACK_METADATA_FILE);
    const title = get(defaultLocaleMetadatafile, this.PACK_TITLE_PROP);
    const description = get(defaultLocaleMetadatafile, this.PACK_DESCRIPTION_PROP);
    if (!title) throw new PackageMetadataError(chalk`{cyan ${this.PACK_TITLE_PROP}} not defined in {yellow ${path.relative(this.CWD, this.PACK_METADATA_FILE)}}. It needs to be.`);
    if (!description) throw new PackageMetadataError(chalk`{cyan ${this.PACK_DESCRIPTION_PROP}} not defined in {yellow ${path.relative(this.CWD, this.PACK_METADATA_FILE)}}. It needs to be.`);
    return { title, description };
  },
  async getPackMetadata() {
    const packageMetadata = await this.getPackageMetadata();
    const defaultLocaleMetadata = await this.getDefaultLocaleMetadata();
    return { ...packageMetadata, ...defaultLocaleMetadata };
  },
};
