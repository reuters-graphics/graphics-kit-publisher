import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';

import { cleanOutDir, deleteZeroLengthFiles } from './clean';

vi.mock('@clack/prompts', () => ({
  log: {
    warn: vi.fn(),
  },
}));

import { log } from '@clack/prompts';

describe('cleanOutDir', () => {
  beforeEach(() => {
    mockFs({
      'existing-outDir': {
        'file1.txt': 'Some content',
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    vi.clearAllMocks();
  });

  it('removes an existing outDir and recreates it', () => {
    const outDirPath = path.join('existing-outDir');

    // Ensure the directory and file currently exist
    expect(fs.existsSync(outDirPath)).toBe(true);
    expect(fs.existsSync(path.join(outDirPath, 'file1.txt'))).toBe(true);

    cleanOutDir(outDirPath);

    // Should recreate an empty folder
    expect(fs.existsSync(outDirPath)).toBe(true);
    const files = fs.readdirSync(outDirPath);
    expect(files).toHaveLength(0); // outDir is empty now
  });

  it('creates the outDir if it does not exist', () => {
    const newOutDir = 'new-outDir';
    expect(fs.existsSync(newOutDir)).toBe(false);

    cleanOutDir(newOutDir);

    expect(fs.existsSync(newOutDir)).toBe(true);
    const files = fs.readdirSync(newOutDir);
    expect(files).toHaveLength(0);
  });
});

describe('deleteZeroLengthFiles', () => {
  const outDirPath = 'dist';

  beforeEach(() => {
    // Setup a mock file system
    mockFs({
      [outDirPath]: {
        'empty-file1.txt': '', // zero-length
        'empty-file2.js': '', // zero-length
        'non-empty.md': 'Hello world', // not zero-length
        'sub-folder': {
          'inner-empty.txt': '', // zero-length
          'inner-non-empty.txt': 'test',
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
    vi.clearAllMocks();
  });

  it('deletes zero-length files and logs a warning', () => {
    deleteZeroLengthFiles(outDirPath);

    // Verify zero-length files were removed
    expect(fs.existsSync(path.join(outDirPath, 'empty-file1.txt'))).toBe(false);
    expect(fs.existsSync(path.join(outDirPath, 'empty-file2.js'))).toBe(false);
    expect(
      fs.existsSync(path.join(outDirPath, 'sub-folder/inner-empty.txt'))
    ).toBe(false);

    // Verify non-zero files remain
    expect(fs.existsSync(path.join(outDirPath, 'non-empty.md'))).toBe(true);
    expect(
      fs.existsSync(path.join(outDirPath, 'sub-folder/inner-non-empty.txt'))
    ).toBe(true);

    // Expect log.warn to have been called with correct message
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Deleted 3 empty files')
    );
  });

  it('does not log a warning if no zero-length files exist', () => {
    // First, remove all empty files from the mock FS so none remain
    fs.removeSync(path.join(outDirPath, 'empty-file1.txt'));
    fs.removeSync(path.join(outDirPath, 'empty-file2.js'));
    fs.removeSync(path.join(outDirPath, 'sub-folder/inner-empty.txt'));

    // Now call deleteZeroLengthFiles
    deleteZeroLengthFiles(outDirPath);

    // Expect that log.warn was never called because there were no empty files
    expect(log.warn).not.toHaveBeenCalled();
  });
});
