import { context } from '../../../context';
import path from 'path';
import fs from 'fs';
import { utils } from '@reuters-graphics/graphics-bin';
import * as find from 'empathic/find';
import ignore from 'ignore';
import { globSync } from 'glob';
import archiver from 'archiver';
import {
  EditionArchiveError,
  FileNotFoundError,
} from '../../../exceptions/errors';
import { note } from '@reuters-graphics/clack';
import dedent from 'dedent';
import picocolors from 'picocolors';

const SPECIALLY_IGNORED_FILES = ['*.secret.*', '.graphics-kit/*'];
const MAX_ARCHIVE_MB_SIZE = 150;

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
      .add([
        ...SPECIALLY_IGNORED_FILES,
        ...context.config.archiveEditions.ignore,
      ])
      .add(fs.readFileSync(ignoreFile, 'utf8'))
      .createFilter();

    const files = globSync('**/*', {
      cwd,
      nodir: true,
      ignore: ['**/node_modules/**'],
    }).filter(gitignoreFilter);

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

    const stats = fs.statSync(this.archivePath);
    const fileSizeInMegabytes = stats.size / (1024 * 1024);
    if (fileSizeInMegabytes > MAX_ARCHIVE_MB_SIZE) {
      note(
        dedent`The zip archive for your project is over ${MAX_ARCHIVE_MB_SIZE}MB. That's too large to upload to
      the graphics server.
      
      Check the files in your project for any especially large ones and remove them
      or add them to the ${picocolors.cyan('archiveEditions.ignore')} setting in your publisher.config.ts.
      `,
        'Project zip too large'
      );
      throw new EditionArchiveError(
        `Project archive is over ${MAX_ARCHIVE_MB_SIZE}MB limit.`
      );
    }

    fs.copyFileSync(this.archivePath, outpath);
  }
}

export const srcArchive = SrcArchive.getInstance();
