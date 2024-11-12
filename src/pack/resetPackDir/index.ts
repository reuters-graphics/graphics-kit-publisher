import type { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import { rimrafSync } from 'rimraf';

export default (config: ConfigType) => {
  rimrafSync(config.PACK_DIR);
  fs.mkdirpSync(config.PACK_DIR);
};
