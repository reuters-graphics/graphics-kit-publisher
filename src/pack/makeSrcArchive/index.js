import getPkgRoot from '../../utils/getPkgRoot';
import path from 'path';
import simpleGit from 'simple-git/promise';
import { spawnSync } from 'child_process';

export default {
  async makeSrcArchive() {
    const PKG_ROOT = getPkgRoot();
    const git = simpleGit(PKG_ROOT);
    await git.add('.');
    await git.commit('Build for publish');
    const ARCHIVE_PATH = path.relative(PKG_ROOT, path.join(this.PACK_DIR, 'app.zip'));
    const ASSETS_DIR = path.relative(PKG_ROOT, this.ASSETS_DIR);
    spawnSync('git', ['archive', '-o', ARCHIVE_PATH, 'HEAD', '.', `:!${ASSETS_DIR}`, ':!project-files'], { cwd: PKG_ROOT });
  },
};
