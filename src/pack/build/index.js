import { spawnSync } from 'child_process';

export default {
  /**
   * Runs project's npm build script, which should run whatever bundler to build
   * pages before they're packed into the pack's edition archives.
   */
  build() {
    spawnSync('npm', ['run', 'build'], { stdio: ['pipe', process.stdout, process.stderr], cwd: this.CWD });
  },
};
