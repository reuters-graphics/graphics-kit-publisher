import type { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import path from 'path';

export default async (config: ConfigType) => {
  const EDITION_DIR = path.join(config.PACK_DIR, 'public/interactive');
  fs.ensureDirSync(EDITION_DIR);
  fs.copySync(config.DIST_DIR, EDITION_DIR);
};
