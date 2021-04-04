import fs from 'fs-extra';
import path from 'path';

export default {
  async makePublicEdition() {
    const EDITION_DIR = path.join(this.PACK_DIR, 'public/interactive');
    fs.ensureDirSync(EDITION_DIR);
    fs.copySync(this.DIST_DIR, EDITION_DIR);
  },
};
