import simpleGit from 'simple-git/promise';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();

const git = simpleGit(ROOT);

export default async() => {
  try {
    await git.add('.');
    await git.commit('Pre-archive', { '--allow-empty': null });
  } catch (e) {
    console.log('Could not git commit changes. Maybe nothing changed?');
  }

  spawnSync('git', ['archive', '-o', 'packages/app.zip', 'HEAD', '.', ':!project-files'], { cwd: ROOT });
};
