import { S3Client, utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { globSync } from 'glob';
import { PREVIEW_ORIGIN } from '../constants/preview';
import { PKG } from '../pkg';
import { spinner } from '@reuters-graphics/clack';

export class SeparateAssets {
  private dir?: string;
  private tempArchivePath = path.join(
    context.cwd,
    '.graphics-kit/archive/assets.zip'
  );
  constructor() {
    if (context.config.archiveEditions.separateAssets) {
      const absPath = utils.path.absolute(
        context.config.archiveEditions.separateAssets
      );
      if (fs.existsSync(absPath) && fs.lstatSync(absPath).isDirectory()) {
        this.dir = absPath;
      }
    }
  }

  /**
   * Used to exclude files from the archive of source files we send
   * to the graphics server. Cf. `src/pack/edition/utils/archive.ts`.
   */
  get ignoreGlobs() {
    return this.dir ? [`${this.dir.replace(/\/$/, '')}/**`] : [];
  }

  private async makeArchive() {
    if (!this.dir) return;

    utils.fs.ensureDir(this.tempArchivePath);

    const cwd = this.dir;

    const files = globSync('**/*', {
      cwd,
      nodir: true,
    });

    const output = fs.createWriteStream(this.tempArchivePath);
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
  }

  async packAndUpload() {
    if (!this.dir) return;
    const packId = PKG.pack.id;
    if (!packId) return;
    const s = spinner(2000);
    try {
      s.start('Packaging separate assets');
      await this.makeArchive();
      await s.stop('📦 All packed.');

      const bucketKey = `client-files/pack-assets/${packId}/assets.zip`;
      const url = `${PREVIEW_ORIGIN}/${bucketKey}`;
      PKG.separateAssets = url;

      s.start('Uploading separate assets archive to S3.');
      const s3 = new S3Client();
      await s3.uploadLocalFile(this.tempArchivePath, bucketKey);
      await s.stop('Uploaded to S3.');

      fs.rmSync(this.tempArchivePath);
    } catch {
      await s.stop('Error uploading separate assets archive.');
    }
  }
}
