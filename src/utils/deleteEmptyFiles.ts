import fs from 'fs-extra';
import * as path from 'path';

/**
 * Recursively deletes all files with zero length in the specified directory.
 * @param dirPath - The path to the directory to scan.
 */
export const deleteZeroLengthFilesRecursive = (dirPath: string) => {
  const entries = fs.readdirSync(dirPath);

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry);
    const stats = fs.statSync(entryPath);

    if (stats.isDirectory()) {
      // Recurse into subfolders
      deleteZeroLengthFilesRecursive(entryPath);
    } else if (stats.isFile() && stats.size === 0) {
      // Delete zero-length file
      fs.unlinkSync(entryPath);
      console.log(
        `🗑️ Deleted empty file: ${path.relative(dirPath, entryPath)}`
      );
    }
  }
};
