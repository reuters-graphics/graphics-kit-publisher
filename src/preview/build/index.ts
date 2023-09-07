import { ConfigType } from '../../setConfig';
import { PackageConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getPkg from '../../utils/getPkg';
import getPkgRoot from '../../utils/getPkgRoot';
import { rimrafSync } from 'rimraf';
import { spawnSync } from 'child_process';

/**
 * Runs project's npm build:preview script, which should run whatever bundler
 * to build pages in DIST_DIR.
 */
export default (config: ConfigType) => {
  const pkg = getPkg();
  const CWD = getPkgRoot();
  if (!pkg.scripts['build:preview']) {
    throw new PackageConfigError(
      chalk`{cyan package.json} has no {yellow build:preview} script. It needs one.`
    );
  }
  if (fs.existsSync(config.DIST_DIR)) rimrafSync(config.DIST_DIR);
  fs.mkdirpSync(config.DIST_DIR);
  spawnSync('npm', ['run', 'build:preview'], {
    stdio: ['pipe', process.stdout, process.stderr],
    cwd: CWD,
  });
};
