import { describe, it, expect } from 'vitest';
import { setProject } from '../../../__test__/project';
import { Edition } from './base';
import { Pack } from '../..';

describe('Edition', async () => {
  it('should throw errors', async () => {
    setProject({
      './media-files/en/map/graphic.JPG': '',
    });

    const pack = new Pack();
    expect(
      () =>
        new Edition(
          'interactive',
          pack,
          './media-files/en/map/graphic.JPG',
          // @ts-ignore testing bad locale
          'zz',
          'map'
        )
    ).toThrow('Found invalid locale');

    /**
     * A path that isn't in the project at all. This used to be
     * `graphic.jpg` — the same name as the fixture above but lowercased —
     * which only counts as missing on a case-sensitive filesystem. macOS temp
     * dirs are case-insensitive, so `graphic.jpg` now resolves to the fixture
     * and the edition constructs fine.
     */
    expect(
      () =>
        new Edition(
          'interactive',
          pack,
          './media-files/en/map/missing.jpg',
          'en',
          'map'
        )
    ).toThrow('Local path for edition detected but not found on file system');
  });
});
