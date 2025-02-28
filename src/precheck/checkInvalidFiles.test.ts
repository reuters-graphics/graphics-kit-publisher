import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mockFs from 'mock-fs';

import { checkInvalidfiles } from './checkInvalidFiles';
import { context } from '../context';
import { FileNotFoundError, FileSystemError } from '../exceptions/errors';

describe('checkInvalidfiles', () => {
  beforeEach(() => {
    context.cwd = 'project';
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('throws FileNotFoundError if no .gitignore is found in the project', () => {
    mockFs({
      project: {
        'file.txt': 'Some text',
      },
    });

    expect(() => checkInvalidfiles()).toThrow(FileNotFoundError);
  });

  it('does not throw an error when no invalid files exist', () => {
    mockFs({
      project: {
        '.gitignore': 'node_modules\n.env\n',
        'file.txt': 'Valid file',
        'image.png': 'Binary content',
      },
    });

    expect(() => checkInvalidfiles()).not.toThrow();
  });

  it('throws FileSystemError when .zip files are present', () => {
    mockFs({
      project: {
        '.gitignore': 'node_modules\n.env\n',
        'file.txt': 'Valid file',
        src: {
          'archive.zip': 'Zipped content', // Invalid file
        },
      },
    });

    expect(() => checkInvalidfiles()).toThrow(FileSystemError);
  });

  it('ignores files/directories specified in .gitignore', () => {
    mockFs({
      project: {
        '.gitignore': 'node_modules\ndist',
        node_modules: {
          'ignored.zip': 'Zipped inside node_modules',
        },
        dist: {
          'ignored2.zip': 'Zipped inside dist folder',
        },
        'valid.txt': 'Still valid',
      },
    });

    expect(() => checkInvalidfiles()).not.toThrow();
  });
});
