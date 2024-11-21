import type { ConfigType } from '../../setConfig';
import { EditionArchiveError } from '../../exceptions/errors';
import { MAX_ARCHIVE_MB_SIZE } from '../../constants/archives';
import chalk from 'chalk';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import zipDir from '../../utils/zipDir';

export default async (config: ConfigType) => {
  const editions = glob.sync('*/', { cwd: config.PACK_DIR });
  for (const edition of editions) {
    await zipDir(path.join(config.PACK_DIR, edition));
    const editionArchiveFile = edition.replace('/', '') + '.zip';
    const stats = fs.statSync(path.join(config.PACK_DIR, editionArchiveFile));
    const fileSizeInMegabytes = stats.size / (1024 * 1024);
    if (fileSizeInMegabytes > MAX_ARCHIVE_MB_SIZE) {
      throw new EditionArchiveError(
        chalk`Edition {cyan ${edition}} is over {yellow ${MAX_ARCHIVE_MB_SIZE}MB}, which is too large to upload. You should probably check the static files that are part of this edition and make sure none are too large.`
      );
    }
  }
};
