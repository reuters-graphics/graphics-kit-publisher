import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setProject } from '../__test__/project';

import { checkInvalidfiles } from './checkInvalidFiles';
import { context } from '../context';
import { FileNotFoundError, FileSystemError } from '../exceptions/errors';

describe('checkInvalidfiles', () => {
  // The publisher's project root, i.e. the temp project the harness created.
  const projectRoot = context.cwd;

  beforeEach(() => {
    // These fixtures live in a subdirectory, so point the publisher at it.
    context.cwd = 'project';
  });

  afterEach(() => {
    context.cwd = projectRoot;
  });

  it('throws FileNotFoundError if no .gitignore is found in the project', () => {
    setProject({
      project: {
        'file.txt': 'Some text',
      },
    });

    expect(() => checkInvalidfiles()).toThrow(FileNotFoundError);
  });

  it('does not throw an error when no invalid files exist', () => {
    setProject({
      project: {
        '.gitignore': 'node_modules\n.env\n',
        'file.txt': 'Valid file',
        'image.png': 'Binary content',
      },
    });

    expect(() => checkInvalidfiles()).not.toThrow();
  });

  it('throws FileSystemError when .zip files are present', () => {
    setProject({
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
    setProject({
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
