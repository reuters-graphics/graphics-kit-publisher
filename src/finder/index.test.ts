import { describe, it, expect, beforeEach } from 'vitest';
import { resetProject, writeProject } from '../__test__/project';
import { Pack } from '../pack';
import { Finder } from '.';

beforeEach(() => {
  resetProject();
});

describe('finder', async () => {
  describe('finderEditions', async () => {
    it('should find multiple editions', async () => {
      // The finder reads `context.config`, which is the default config here —
      // its packLocations are `dist/`, `dist/embeds/{locale}/{slug}/` and
      // `media-assets/{locale}/{slug}/`, i.e. the paths written below.
      writeProject({
        'dist/index.html': '<html></html>',
        'dist/embeds/en/map/index.html': '<html></html>',
        'dist/embeds/en/chart/index.html': '<html></html>',
        'dist/embeds/en/referral/index.html': '<html></html>',
        'dist/embeds/de/map/index.html': '<html></html>',
        'media-assets/en/map/graphic.JPG': '',
        'media-assets/en/map/graphic.pdf': '',
        'media-assets/de/map/graphic.png': '',
        'media-assets/de/map/graphic.eps': '',
        'media-assets/it/map/graphic.eps': '',
      });

      const pack = new Pack();
      const finder = new Finder(pack);

      finder.findEditions();
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
