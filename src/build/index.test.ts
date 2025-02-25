import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { utils } from '@reuters-graphics/graphics-bin';
import { logs } from '../logging';
import { validateOutDir } from './validate';
import { cleanOutDir, deleteZeroLengthFiles } from './clean';

import { buildForPreview, buildForProduction } from '.';
import { BuildError, PackageConfigError } from '../exceptions/errors';

// Mock external modules
vi.mock('child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('@reuters-graphics/graphics-bin', () => ({
  utils: {
    getPkg: vi.fn(),
  },
}));

vi.mock('../logging', () => ({
  logs: {
    writeErrLog: vi.fn(),
    writeOutLog: vi.fn(),
    logDirName: '.graphics-kit/',
  },
}));

vi.mock('../context', () => ({
  context: {
    cwd: '/fake/project',
    config: {
      build: {
        outDir: 'dist',
        scripts: {
          preview: 'build:preview',
          production: 'build',
        },
      },
    },
  },
}));

vi.mock('./validate', () => ({
  validateOutDir: vi.fn(),
}));

vi.mock('./clean', () => ({
  cleanOutDir: vi.fn(),
  deleteZeroLengthFiles: vi.fn(),
}));

describe('build', () => {
  beforeEach(() => {
    // Clear mock call counts
    vi.clearAllMocks();

    // Setup a basic mock file system
    mockFs({
      '/fake/project': {
        'package.json': JSON.stringify({
          scripts: {
            // We'll modify these in tests as needed
            'build:preview': 'echo "Building preview..."',
            build: 'echo "Building production..."',
          },
        }),
        dist: {
          'index.html': '<html></html>',
          cdn: {
            'empty.js': '', // zero-length file to test deletion
          },
        },
      },
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('throws PackageConfigError if the specified script does not exist in package.json', () => {
    // Setup: return a package.json that does NOT have the script we need
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        // missing 'build:preview' or 'build:prod'
      },
    });

    // Attempt to build a preview
    expect(() => buildForPreview()).toThrowError(PackageConfigError);
  });

  it('throws BuildError if spawnSync returns a non-zero status', () => {
    // Return a package.json that includes correct scripts
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawnSync to return a failing status code
    (spawnSync as Mock).mockReturnValue({
      status: 1,
      stdout: Buffer.from('Some build output'),
      stderr: Buffer.from('Some build error'),
    });

    expect(() => buildForPreview()).toThrowError(BuildError);

    // Make sure logs were captured
    expect(logs.writeErrLog).toHaveBeenCalledWith('Some build error');
    expect(logs.writeOutLog).toHaveBeenCalledWith('Some build output');
  });

  it('cleans output directory, spawns the build script, validates outDir on success for preview build', () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawnSync to succeed
    (spawnSync as Mock).mockReturnValue({
      status: 0,
      stdout: Buffer.from('Preview build completed'),
      stderr: Buffer.from(''),
    });

    buildForPreview();

    // Expect the output directory was cleaned
    expect(cleanOutDir).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
    // Expect spawnSync was called with correct arguments
    expect(spawnSync).toHaveBeenCalledWith('npm', ['run', 'build:preview'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: '/fake/project',
    });
    // Expect zero-length files to be deleted
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
    // Expect validateOutDir to be called
    expect(validateOutDir).toHaveBeenCalled();
    // Expect logs to capture the stdout
    expect(logs.writeOutLog).toHaveBeenCalledWith('Preview build completed');
  });

  it('cleans output directory, spawns the build script, validates outDir on success for production build', () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawnSync to succeed
    (spawnSync as Mock).mockReturnValue({
      status: 0,
      stdout: Buffer.from('Production build completed'),
      stderr: Buffer.from(''),
    });

    buildForProduction();

    // Expect the output directory was cleaned
    expect(cleanOutDir).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
    // Expect spawnSync was called with correct arguments
    expect(spawnSync).toHaveBeenCalledWith('npm', ['run', 'build'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: '/fake/project',
    });
    // Expect zero-length files to be deleted
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
    // Expect validateOutDir to be called
    expect(validateOutDir).toHaveBeenCalled();
    // Expect logs to capture the stdout
    expect(logs.writeOutLog).toHaveBeenCalledWith('Production build completed');
  });

  it('deletes zero-length files in outDir (e.g., empty.js)', () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawnSync to succeed
    (spawnSync as Mock).mockReturnValue({
      status: 0,
      stdout: Buffer.from('Preview build done'),
      stderr: Buffer.from(''),
    });

    buildForPreview();

    // Ensure deleteZeroLengthFiles is called, simulating removal of empty.js
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith('/fake/project/dist');
  });
});
