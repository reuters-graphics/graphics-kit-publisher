import { PackageConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../../utils/getPkg';
import { spawnSync } from 'child_process';

export default {
  /**
   * Runs project's npm build script, which should run whatever bundler to build
   * pages before they're packed into the pack's edition archives.
   */
  build() {
    const pkg = getPkg();
    if (!pkg.scripts.build) throw new PackageConfigError(chalk`{cyan package.json} has no {yellow build} script. It needs one.`);
    spawnSync('npm', ['run', 'build'], { stdio: ['pipe', process.stdout, process.stderr], cwd: this.CWD });
  },
};
