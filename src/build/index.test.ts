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
import path from 'path';

import { projectDir } from '../__test__/project';
import {
  PLACEHOLDER_BASE,
  PLACEHOLDER_BASE_ENV_VAR,
} from '../constants/rewrite';
import { PREVIEW_BASE_ENV_VAR } from '../constants/preview';

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
    // The harness runs each test file from its own temp project directory.
    cwd: process.cwd(),
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
    expect(cleanOutDir).toHaveBeenCalledWith(path.join(projectDir, 'dist'));

    // A preview build inherits the environment, and must not be handed the
    // placeholder base — its URL is already known.
    expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build:preview'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: projectDir,
      env: expect.not.objectContaining({
        [PLACEHOLDER_BASE_ENV_VAR]: expect.anything(),
      }),
    });

    // Expect zero-length files to be deleted
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith(
      path.join(projectDir, 'dist')
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
    expect(cleanOutDir).toHaveBeenCalledWith(path.join(projectDir, 'dist'));
    // Expect spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith('npm', ['run', 'build'], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: projectDir,
      env: expect.objectContaining({
        [PLACEHOLDER_BASE_ENV_VAR]: PLACEHOLDER_BASE,
      }),
    });
    // Expect zero-length files to be deleted
    expect(deleteZeroLengthFiles).toHaveBeenCalledWith(
      path.join(projectDir, 'dist')
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
      path.join(projectDir, 'dist')
    );
  });

  describe('base URL env vars', () => {
    /** The env `spawn` was called with, or undefined if it wasn't passed one. */
    const spawnEnv = () =>
      ((spawn as Mock).mock.calls[0][2] as { env?: NodeJS.ProcessEnv }).env;

    beforeEach(() => {
      (utils.getPkg as Mock).mockReturnValue({
        scripts: {
          'build:preview': 'echo "Preview build"',
          build: 'echo "Prod build"',
        },
      });
      (spawn as Mock).mockImplementation(() => mockSpawnProcess({ code: 0 }));
    });

    afterEach(() => {
      delete process.env[PLACEHOLDER_BASE_ENV_VAR];
    });

    it('tells a branch preview which URL it is building for', async () => {
      const url = 'https://graphics.thomsonreuters.com/testfiles/2025/x/feat/';

      await buildForPreview(url);

      expect(spawnEnv()).toMatchObject({ [PREVIEW_BASE_ENV_VAR]: url });
    });

    it('strips a stale placeholder base from a preview build', async () => {
      // getBasePath checks the placeholder first and unconditionally, so a
      // value left exported in someone's shell would otherwise bake
      // __GKP_BASE__ into a preview and upload it with nothing to rewrite it.
      process.env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;

      await buildForPreview('https://example.org/preview/feat/');

      expect(spawnEnv()).not.toHaveProperty(PLACEHOLDER_BASE_ENV_VAR);
    });

    it('does not hand a production build a preview base', async () => {
      process.env[PREVIEW_BASE_ENV_VAR] = 'https://example.org/preview/feat/';

      await buildForProduction();

      expect(spawnEnv()).not.toHaveProperty(PREVIEW_BASE_ENV_VAR);
      delete process.env[PREVIEW_BASE_ENV_VAR];
    });

    it('strips both stale bases even from a build that sets neither', async () => {
      // The guarantee can't be conditional on the publisher happening to set one
      // of them: these two variables are the publisher's to say, so every build
      // it spawns gets exactly what it's entitled to and nothing left over.
      process.env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;
      process.env[PREVIEW_BASE_ENV_VAR] = 'https://example.org/stale/';

      await buildForPreview();

      expect(spawnEnv()).not.toHaveProperty(PLACEHOLDER_BASE_ENV_VAR);
      expect(spawnEnv()).not.toHaveProperty(PREVIEW_BASE_ENV_VAR);
      delete process.env[PREVIEW_BASE_ENV_VAR];
    });

    it('leaves the rest of the environment alone', async () => {
      process.env.SOME_PROJECT_VAR = 'kept';

      await buildForPreview('https://example.org/preview/feat/');

      expect(spawnEnv()).toMatchObject({ SOME_PROJECT_VAR: 'kept' });
      delete process.env.SOME_PROJECT_VAR;
    });
  });
});
