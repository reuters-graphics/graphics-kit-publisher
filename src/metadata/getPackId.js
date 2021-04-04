import { PackageMetadataError } from '../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../utils/getPkg';
import { graphicIdRegex } from '../constants/metadata';

export default {
  getPackId() {
    const { reuters } = getPkg();
    const { packId } = reuters.graphic;
    if (!packId) return null;
    if (!graphicIdRegex.test(packId)) throw new PackageMetadataError(chalk`Invalid {yellow reuters.graphic.packId} in {cyan package.json}`);
    this.packId = packId;
  },
};
