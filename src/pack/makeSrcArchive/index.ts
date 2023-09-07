import { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import getPkgRoot from '../../utils/getPkgRoot';
import path from 'path';
import { simpleGit } from 'simple-git';
import { spawnSync } from 'child_process';
import unzipper from 'unzipper';
import zipDir from '../../utils/zipDir';

export default async (config: ConfigType, testing = false) => {
  const PKG_ROOT = getPkgRoot();

  const ARCHIVE_TEMP_PATH = path.join(config.PACK_DIR, '_app.zip');
  const ARCHIVE_TEMP_RELATIVE_PATH = path.relative(PKG_ROOT, ARCHIVE_TEMP_PATH);
  const ARCHIVE_DIR_PATH = path.join(config.PACK_DIR, 'app');
  const ASSETS_DIR = path.relative(PKG_ROOT, config.ASSETS_DIR);

  // When testing, we'll skip git commit and mock the archive.
  if (!testing) {
    const git = simpleGit(PKG_ROOT);
    try {
      await git.add('.');
      await git.commit('Build for publish', { '--allow-empty': null });
    } catch (e) {
      console.log('Could not git commit changes. Maybe nothing changed?');
    }
    spawnSync(
      'git',
      [
        'archive',
        '-o',
        ARCHIVE_TEMP_RELATIVE_PATH,
        'HEAD',
        '.',
        `:!${ASSETS_DIR}`,
        ':!project-files',
      ],
      { cwd: PKG_ROOT }
    );
  }

  // Re-zip the archive for:
  // https://github.com/reuters-graphics/graphics-kit-publisher/issues/52
  await new Promise<void>((resolve) => {
    fs.createReadStream(ARCHIVE_TEMP_PATH).pipe(
      unzipper.Extract({ path: ARCHIVE_DIR_PATH }).on('close', async () => {
        fs.rmSync(ARCHIVE_TEMP_PATH);
        await zipDir(ARCHIVE_DIR_PATH);
        resolve();
      })
    );
  });
};
