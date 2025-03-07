import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import { Edition } from './base';
import { Pack } from '../..';

afterEach(() => {
  mockFs.restore();
});

describe('Edition', async () => {
  it('should throw errors', async () => {
    mockFs({
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

    expect(
      () =>
        new Edition(
          'interactive',
          pack,
          './media-files/en/map/graphic.jpg',
          'en',
          'map'
        )
    ).toThrow('Local path for edition detected but not found on file system');
  });
});
