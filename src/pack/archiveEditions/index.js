import glob from 'glob';
import path from 'path';
import zipDir from '../../utils/zipDir';

export default {
  async archiveEditions() {
    const editions = glob.sync('*/', { cwd: this.PACK_DIR });
    for (const edition of editions) {
      await zipDir(path.join(this.PACK_DIR, edition));
    }
  },
};
