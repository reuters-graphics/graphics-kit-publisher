import { simpleGit } from 'simple-git';
import { spawnSync } from 'child_process';
import { context } from '../../../context';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';

const git = simpleGit(context.cwd);

/**
 * Make a ZIP file archive of the project repository
 * @param outputPath Path to a .zip file to archive the repo to
 */
export const makeGitArchive = async (outputPath: string) => {
  try {
    await git.add('.');
    await git.commit('pre-archive', { '--allow-empty': null });
  } catch {
    // OK to fail ...
  }

  if (path.extname(outputPath) !== '.zip')
    throw new Error('Path must be to a zipfile');

  utils.fs.ensureDir(outputPath);

  spawnSync(
    'git',
    [
      'archive',
      '--format=zip',
      '-o',
      outputPath,
      'HEAD',
      '.',
      ':!project-files',
    ],
    { cwd: context.cwd }
  );
};
