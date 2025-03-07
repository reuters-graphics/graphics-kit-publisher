import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import { note } from '@reuters-graphics/clack';
import { validateOutDir } from './validate';
import { InvalidFileTypeError } from '../exceptions/errors';

// Mock spinner
const mockSpinner = {
  stop: vi.fn(),
  start: vi.fn(),
  message: vi.fn(),
};

// Mock the context, logs, and note
vi.mock('../context', () => ({
  context: {
    cwd: '/fake/project',
    config: {
      build: {
        outDir: 'dist',
      },
    },
  },
}));

vi.mock('../logging', () => ({
  logs: {
    logDirName: 'logs',
  },
}));

vi.mock('@reuters-graphics/clack', () => ({
  note: vi.fn(),
}));

describe('validateOutDir', () => {
  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore any file system modifications after each test
    mockFs.restore();
  });

  // it('throws FileSystemError if index.html is missing', () => {
  //   // Mock a file system with some files but no index.html
  //   mockFs({
  //     '/fake/project/dist': {
  //       'main.js': 'console.log("Hello World")',
  //     },
  //   });

  //   expect(() => validateOutDir(mockSpinner)).toThrow(FileSystemError);

  //   // Check that spinner.stop and note were called with the expected messages
  //   expect(mockSpinner.stop).toHaveBeenCalledWith('Build failed');
  //   expect(note).toHaveBeenCalledTimes(1);
  //   expect(note).toHaveBeenCalledWith(
  //     expect.stringContaining('Your project failed to build'),
  //     'Build error'
  //   );
  // });

  it('throws InvalidFileTypeError if invalid file extensions exist', () => {
    // Here, index.html is present but there's a .exe file
    mockFs({
      '/fake/project/dist': {
        'index.html': '<html>Some HTML</html>',
        'script.js': 'console.log("ok")',
        'unwanted.exe': 'binary data',
      },
    });

    expect(() => validateOutDir(mockSpinner)).toThrow(InvalidFileTypeError);

    // Check that spinner.stop is called and note is displayed
    expect(mockSpinner.stop).toHaveBeenCalledWith('Build failed');
    expect(note).toHaveBeenCalledTimes(1);
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining('unwanted.exe'),
      'Invalid file types'
    );
  });

  it('does not throw if index.html is present and file types are valid', () => {
    // Suppose .html, .js, .css, etc. are in VALID_FILE_TYPES
    mockFs({
      '/fake/project/dist': {
        'index.html': '<html></html>',
        'app.js': 'console.log("valid")',
        'styles.css': 'body { color: red; }',
        // Possibly other valid file types
      },
    });

    expect(() => validateOutDir(mockSpinner)).not.toThrow();
    // Ensure we didn't stop the spinner or show any notes for errors
    expect(mockSpinner.stop).not.toHaveBeenCalledWith('Build failed');
    expect(note).not.toHaveBeenCalled();
  });
});
