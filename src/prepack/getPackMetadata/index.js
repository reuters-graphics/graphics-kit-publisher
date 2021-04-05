import { PackageMetadataError } from '../../exceptions/errors';
import askJSON from 'ask-json';
import chalk from 'chalk';
import fs from 'fs-extra';
import get from 'lodash/get';
import getPkg from '../../utils/getPkg';
import packageSchema from './schemas/package';
import path from 'path';

export default {
  async getPackageMetadata() {
    const packageJson = getPkg();
    const validPackageJson = await askJSON(packageSchema, packageJson, { askToAddItems: true });
    fs.writeFileSync(path.join(this.CWD, 'package.json'), JSON.stringify(validPackageJson, null, 2));
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
