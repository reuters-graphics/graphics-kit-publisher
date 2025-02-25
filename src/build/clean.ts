import fs from 'fs-extra';
import { rimrafSync } from 'rimraf';
import path from 'path';
import { glob } from 'glob';
import { log } from '@clack/prompts';

export const cleanOutDir = (outDir: string) => {
  if (fs.existsSync(outDir)) rimrafSync(outDir);
  fs.mkdirpSync(outDir);
};

/**
 * Recursively deletes all files with zero length in the specified directory.
 *
 * Used to clear empty files out of outDir which the Sphinx server rejects.
 */
export const deleteZeroLengthFiles = (dirPath: string) => {
  const files = glob.sync('**/*', { cwd: dirPath, nodir: true });

  const zeroLengthFiles: string[] = [];

  for (const file of files) {
    const entryPath = path.join(dirPath, file);
    const stats = fs.statSync(entryPath);
    if (stats.isFile() && stats.size === 0) {
      // Delete zero-length file
      fs.unlinkSync(entryPath);
      zeroLengthFiles.push(file);
    }
  }
  if (zeroLengthFiles.length > 0) {
    log.warn(
      `🗑️ Deleted ${zeroLengthFiles.length} empty files in build output that would have been rejected by the graphics server.`
    );
  }
};
