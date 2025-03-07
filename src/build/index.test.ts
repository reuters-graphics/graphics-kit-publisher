import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { EventEmitter } from 'events';
import mockFs from 'mock-fs';
import path from 'path';

import { spawn, type ChildProcess } from 'child_process';
import { utils } from '@reuters-graphics/graphics-bin';
import { logs } from '../logging';
import { cleanOutDir, deleteZeroLengthFiles } from './clean';
import { validateOutDir } from './validate';
import { buildForPreview, buildForProduction } from '.';
import { BuildError, PackageConfigError } from '../exceptions/errors';

// Mock external modules
vi.mock('child_process', () => ({
  spawn: vi.fn(),
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

/**
 * Helper function to mock the spawn process in an asynchronous, event-driven way.
 * We simulate the child process by returning an EventEmitter with mocked stdout/stderr streams.
 */
function mockSpawnProcess({
  code = 0,
  stdout = '',
  stderr = '',
  delay = 10, // small delay to ensure listeners are set up
}: {
  code?: number;
  stdout?: string;
  stderr?: string;
  delay?: number;
}): ChildProcess {
  // Create an EventEmitter to mimic ChildProcess
  const child = new EventEmitter() as ChildProcess;

  // The real child.stdout and child.stderr are streams (EventEmitters),
  // so we mock them out similarly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  child.stdout = new EventEmitter() as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  child.stderr = new EventEmitter() as any;

  // Emit data + close event on a short delay to simulate async process
  setTimeout(() => {
    if (stdout) {
      child.stdout?.emit('data', stdout);
    }
    if (stderr) {
      child.stderr?.emit('data', stderr);
    }
    // Indicate process completion with exit code
    child.emit('close', code);
  }, delay);

  return child;
}

describe('build (async spawn)', () => {
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

  it('throws PackageConfigError if the specified script does not exist in package.json', async () => {
    // Setup: return a package.json that does NOT have the script we need
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        // Missing 'build:preview' or 'build' here
      },
    });

    // Attempt to build a preview -> should fail before spawn is even called
    await expect(buildForPreview()).rejects.toThrowError(PackageConfigError);

    // spawn should never be called because we bail out on missing script
    expect(spawn).not.toHaveBeenCalled();
  });

  it('throws BuildError if spawn returns a non-zero exit code', async () => {
    // Return a package.json that includes correct scripts
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Production build"',
      },
    });

    // Mock spawn to emit non-zero exit code + some errors
    (spawn as Mock).mockImplementation(() =>
      mockSpawnProcess({
        code: 1,
        stdout: 'Some build output',
        stderr: 'Some build error',
      })
    );

    // Attempt to build a preview -> should throw BuildError
    await expect(buildForPreview()).rejects.toThrowError(BuildError);

    // Make sure logs were captured
    expect(logs.writeErrLog).toHaveBeenCalledWith('Some build error');
    expect(logs.writeOutLog).toHaveBeenCalledWith('Some build output');
  });

  it('cleans output directory, spawns the build script, validates outDir on success for preview build', async () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawn to succeed (exit code 0)
    (spawn as Mock).mockImplementation(() =>
      mockSpawnProcess({
        code: 0,
        stdout: 'Preview build completed',
        stderr: '',
      })
    );

    await buildForPreview();

    // Expect the output directory was cleaned
    expect(cleanOutDir).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );

    // Expect spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build:preview'], {
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

  it('cleans output directory, spawns the build script, validates outDir on success for production build', async () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawn to succeed (exit code 0)
    (spawn as Mock).mockImplementation(() =>
      mockSpawnProcess({
        code: 0,
        stdout: 'Production build completed',
        stderr: '',
      })
    );

    await buildForProduction();

    // Expect the output directory was cleaned
    expect(cleanOutDir).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
    // Expect spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build'], {
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

  it('deletes zero-length files in outDir (e.g., empty.js)', async () => {
    (utils.getPkg as Mock).mockReturnValue({
      scripts: {
        'build:preview': 'echo "Preview build"',
        build: 'echo "Prod build"',
      },
    });

    // Mock spawn to succeed
    (spawn as Mock).mockImplementation(() =>
      mockSpawnProcess({
        code: 0,
        stdout: 'Preview build done',
        stderr: '',
      })
    );

    await buildForPreview();

    // Ensure deleteZeroLengthFiles is called, simulating removal of empty.js
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith(
      path.join('/fake/project', 'dist')
    );
  });
});
