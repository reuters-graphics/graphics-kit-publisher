import Stream from 'stream';
import archiver from 'archiver';
import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';

const createZip = (localDir, resolve, reject) => {
  const writer = new Stream.Writable();
  const chunks = [];

  writer._write = (chunk, encoding, next) => {
    chunks.push(chunk); next();
  };

  const archive = archiver('zip');

  archive.on('error', e => reject(e));
  archive.on('end', () => resolve(Buffer.concat(chunks)));

  const archiveName = path.basename(`${localDir.replace(/\/$/, '')}.zip`, '.zip');

  archive.pipe(writer);
  archive.directory(localDir, archiveName);
  archive.finalize();
};

export default async(localDir) => {
  const archive = await new Promise((resolve, reject) => createZip(localDir, resolve, reject));
  fs.writeFileSync(`${localDir.replace(/\/$/, '')}.zip`, archive);
  rimraf.sync(localDir);
};
