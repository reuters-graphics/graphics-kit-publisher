import fs from 'fs-extra';

export default {
  validatePackDir(PACK_DIR) {
    if (!fs.existsSync(PACK_DIR)) fs.mkdirpSync(PACK_DIR);
  },
};
