import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import fs from 'fs';
import unzipper from 'unzipper';
import {
  EditionArchiveError,
  FileNotFoundError,
} from '../../../exceptions/errors';
import { srcArchive } from './archive';
import dedent from 'dedent';

describe('srcArchive', () => {
  afterEach(() => {
    mockFs.restore();
    // @ts-ignore OK to access private in test
    srcArchive.hasArchived = false;
    vi.clearAllMocks();
  });

  describe('when .gitignore is missing', () => {
    beforeEach(() => {
      mockFs({
        // No .gitignore file
        'file1.txt': 'Hello world',
      });
    });

    it('should throw FileNotFoundError', async () => {
      await expect(srcArchive.makeArchive('/outpath/app.zip')).rejects.toThrow(
        FileNotFoundError
      );
    });
  });

  describe('archiving behavior', () => {
    beforeEach(() => {
      mockFs({
        '.graphics-kit': {
          'config.json': '{}',
        },
        '.gitignore': dedent`
            # Example patterns from .gitignore
            dist/
            *.log`,
        'file1.txt': 'Hello world',
        'file2.log': 'Should be ignored by .gitignore',
        dist: {
          'dist-file.js': '// dist file',
        },
        src: {
          'index.js': '// index file',
          components: {
            'App.svelte': '<div></div>',
          },
        },
        'keys.secret.js': 'secrets',
        'project-files': {
          'config.json': '{ "name": "excluded" }',
        },
      });
    });

    it('should create an archive and exclude ignored patterns', async () => {
      const outZip = '/myOutput/app.zip';
      await srcArchive.makeArchive(outZip);

      expect(fs.existsSync(outZip)).toBe(true);

      const includedFiles: string[] = [];
      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(outZip)
          .pipe(unzipper.Parse())
          .on('entry', (entry) => {
            includedFiles.push(entry.path);
            entry.autodrain();
          })
          .on('error', reject)
          .on('close', resolve);
      });

      expect(includedFiles).toContain('file1.txt');
      expect(includedFiles).toContain('src/index.js');
      expect(includedFiles).toContain('src/components/App.svelte');

      // Excluded by separateAssets config
      expect(includedFiles).not.toContain('project-files/config.json');

      expect(includedFiles).not.toContain('dist/dist-file.js');
      expect(includedFiles).not.toContain('file2.log');
      expect(includedFiles).not.toContain('keys.secret.js');
      expect(includedFiles).not.toContain('.graphics-kit/config.json');
    });

    it('should not recreate the archive if already archived', async () => {
      const outZip = '/myOutput/app.zip';
      const tmpZip = '.graphics-kit/archive/app.zip';
      await srcArchive.makeArchive(outZip);

      expect(fs.existsSync(outZip)).toBe(true);

      const firstStat = fs.statSync(tmpZip);
      const firstMtimeMs = firstStat.mtimeMs;

      await new Promise((res) => setTimeout(res, 1000));

      await srcArchive.makeArchive(outZip);

      const secondStat = fs.statSync(tmpZip);
      const secondMtimeMs = secondStat.mtimeMs;

      expect(secondMtimeMs).toStrictEqual(firstMtimeMs);
    });

    it('should throw an error if archive is too large', async () => {
      const statSyncSpy = vi.spyOn(fs, 'statSync').mockReturnValue({
        isFile: () => true,
        // >150 MB
        size: 150.0000001 * 1024 * 1024,
      } as unknown as fs.Stats);

      const outZip = '/myOutput/app.zip';
      await expect(srcArchive.makeArchive(outZip)).rejects.toThrowError(
        EditionArchiveError
      );
      statSyncSpy.mockRestore();
    });
  });
});
