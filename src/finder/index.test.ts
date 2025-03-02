import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { mockedNodeModules } from '../__test__/utils';
import path from 'path';
import fs from 'fs';
import dedent from 'dedent';
import { Pack } from '../pack';
import { Finder } from '.';

const CWD = process.cwd();

beforeEach(() => {
  process.env.MOCK_FS = 'T';
  mockFs({
    ...mockedNodeModules,
    [path.join(CWD, 'src/')]: mockFs.load(path.join(CWD, 'src/')),
  });
});

afterEach(() => {
  delete process.env.MOCK_FS;
  mockFs.restore();
});

const writeFileSync = (filePath: string, data: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, data);
};

describe('finder', async () => {
  describe('finderEditions', async () => {
    it('should find multiple editions', async () => {
      writeFileSync(
        './publisher.config.ts',
        dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
      
        export default defineConfig({
          packLocations: {
            dotcom: 'dist/',
            embeds: 'dist/embeds/{locale}/{slug}/',
            statics: 'media-files/{locale}/{slug}/',
          },
        });`
      );
      writeFileSync('./dist/index.html', '<html></html>');
      writeFileSync('./dist/embeds/en/map/index.html', '<html></html>');
      writeFileSync('./dist/embeds/en/chart/index.html', '<html></html>');
      writeFileSync('./dist/embeds/en/referral/index.html', '<html></html>');
      writeFileSync('./dist/embeds/de/map/index.html', '<html></html>');
      writeFileSync('./media-files/en/map/graphic.JPG', '');
      writeFileSync('./media-files/en/map/graphic.pdf', '');
      writeFileSync('./media-files/de/map/graphic.png', '');
      writeFileSync('./media-files/de/map/graphic.eps', '');
      writeFileSync('./media-files/it/map/graphic.eps', '');

      const pack = new Pack();
      const finder = new Finder(pack);

      await finder.findEditions();
      finder.logFound();
      expect(pack.archives.length).toBe(5);
      expect(
        pack.archives.some(
          (a) => a.locale === 'en' && a.mediaSlug === undefined
        )
      ).toBe(true);
      expect(
        pack.archives.some(
          (a) => a.locale === 'en' && a.mediaSlug === 'referral'
        )
      ).toBe(true);
      expect(
        pack.archives.some((a) => a.locale === 'en' && a.mediaSlug === 'map')
      ).toBe(true);
      expect(
        pack.archives.some((a) => a.locale === 'en' && a.mediaSlug === 'chart')
      ).toBe(true);
      expect(
        pack.archives.some((a) => a.locale === 'de' && a.mediaSlug === 'map')
      ).toBe(true);

      expect(pack.archives.reduce((a, c) => a + c.editions.length, 0)).toBe(13);
    });
  });
});
