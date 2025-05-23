import Stream from 'stream';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import { rimrafSync } from 'rimraf';

const createZip = (localDir: string): Promise<Buffer> => {
  const writer = new Stream.Writable();
  const chunks: Buffer[] = [];

  writer._write = (chunk: Buffer, _encoding, next) => {
    chunks.push(chunk);
    next();
  };

  const archive = archiver('zip');

  return new Promise((resolve, reject) => {
    archive.on('error', (e: Error) => reject(e));
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    const archiveName = path.basename(
      `${localDir.replace(/\/$/, '')}.zip`,
      '.zip'
    );

    archive.pipe(writer);
    archive.directory(localDir, archiveName);
    archive.finalize();
  });
};

export const zipDir = async (localDir: string) => {
  const archive = await createZip(localDir);
  const zipPath = `${localDir.replace(/\/$/, '')}.zip`;
  fs.writeFileSync(zipPath, archive);
  rimrafSync(localDir);
  return zipPath;
};
