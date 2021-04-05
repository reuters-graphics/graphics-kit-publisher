import { PackageConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../../utils/getPkg';
import { spawnSync } from 'child_process';

export default {
  /**
   * Runs project's npm build:preview script, which should run whatever bundler
   * to build pages in DIST_DIR.
   */
  buildPreview() {
    const pkg = getPkg();
    if (!pkg.scripts['build:preview']) throw new PackageConfigError(chalk`{cyan package.json} has no {yellow build:preview} script. It needs one.`);
    spawnSync('npm', ['run', 'build:preview'], { stdio: ['pipe', process.stdout, process.stderr], cwd: this.CWD });
  },
};
