import type { ConfigType } from '../../setConfig';
import { PackageConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import getPkg from '../../utils/getPkg';
import getPkgRoot from '../../utils/getPkgRoot';
import { rimrafSync } from 'rimraf';
import { spawnSync } from 'child_process';
import { deleteZeroLengthFilesRecursive } from '../../utils/deleteEmptyFiles';

/**
 * Runs project's npm build script, which should run whatever bundler to build
 * pages before they're packed into the pack's edition archives.
 */
export default (config: ConfigType) => {
  const cwd = getPkgRoot();
  const pkg = getPkg();
  if (!pkg.scripts.build) {
    throw new PackageConfigError(
      chalk`{cyan package.json} has no {yellow build} script. It needs one.`
    );
  }
  if (fs.existsSync(config.DIST_DIR)) rimrafSync(config.DIST_DIR);
  fs.mkdirpSync(config.DIST_DIR);
  spawnSync('npm', ['run', 'build'], {
    stdio: ['pipe', process.stdout, process.stderr],
    cwd,
  });
  deleteZeroLengthFilesRecursive(config.DIST_DIR);
};
