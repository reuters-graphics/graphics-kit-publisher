import { context } from '../../../context';
import path from 'path';
import fs from 'fs';
import { utils } from '@reuters-graphics/graphics-bin';
import * as find from 'empathic/find';
import ignore from 'ignore';
import glob from 'glob';
import archiver from 'archiver';
import { FileNotFoundError } from '../../../exceptions/errors';

const SPECIALLY_IGNORED_FILES = [
  'project-files/*',
  '*.secret.*',
  '.graphics-kit/*',
];

class SrcArchive {
  private hasArchived = false;
  private archivePath = path.join(context.cwd, '.graphics-kit/archive/app.zip');
  private static instance: SrcArchive;
  public static getInstance(): SrcArchive {
    if (!SrcArchive.instance) SrcArchive.instance = new SrcArchive();
    return SrcArchive.instance;
  }

  private async archiveProject() {
    if (this.hasArchived) return;
    if (fs.existsSync(this.archivePath)) fs.rmSync(this.archivePath);
    utils.fs.ensureDir(this.archivePath);

    const { cwd } = context;

    const ignoreFile = find.up('.gitignore', { cwd });
    if (!ignoreFile)
      throw new FileNotFoundError(
        'Error finding .gitignore in this project. One should be in the project root.'
      );

    const gitignoreFilter = ignore()
      .add(SPECIALLY_IGNORED_FILES)
      .add(fs.readFileSync(ignoreFile, 'utf8'))
      .createFilter();

    const files = glob
      .sync('**/*', { cwd, nodir: true })
      .filter(gitignoreFilter);

    const output = fs.createWriteStream(this.archivePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);

      for (const file of files) {
        const fullPath = path.join(cwd, file);
        archive.file(fullPath, { name: file });
      }

      archive.finalize();
    });

    this.hasArchived = true;
  }

  async makeArchive(outpath: string) {
    await this.archiveProject();
    utils.fs.ensureDir(outpath);
    fs.copyFileSync(this.archivePath, outpath);
  }
}

export const srcArchive = SrcArchive.getInstance();
