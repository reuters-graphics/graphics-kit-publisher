import simpleGit from 'simple-git/promise';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();

const git = simpleGit(ROOT);

export default async() => {
  await git.add('.');
  await git.commit('Pre-archive');
  spawnSync('git', ['archive', '-o', 'packages/app.zip', 'HEAD', '.', ':!project-files'], { cwd: ROOT });
};
