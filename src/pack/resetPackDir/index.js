import fs from 'fs-extra';
import rimraf from 'rimraf';

export default {
  resetPackDir() {
    rimraf.sync(this.PACK_DIR);
    fs.mkdirpSync(this.PACK_DIR);
  },
};
