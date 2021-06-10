import { PackageConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getPkg from '../../utils/getPkg';
import rimraf from 'rimraf';
import { spawnSync } from 'child_process';

export default {
  /**
   * Runs project's npm build script, which should run whatever bundler to build
   * pages before they're packed into the pack's edition archives.
   */
  build() {
    const pkg = getPkg();
    if (!pkg.scripts.build) throw new PackageConfigError(chalk`{cyan package.json} has no {yellow build} script. It needs one.`);
    if (fs.existsSync(this.DIST_DIR)) rimraf.sync(this.DIST_DIR);
    fs.mkdirpSync(this.DIST_DIR);
    spawnSync('npm', ['run', 'build'], { stdio: ['pipe', process.stdout, process.stderr], cwd: this.CWD });
  },
};
