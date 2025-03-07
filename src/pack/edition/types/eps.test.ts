import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { EPS } from './eps';
import { JPG } from './jpg';
import { Pack } from '../..';

afterEach(() => {
  mockFs.restore();
});

describe('EPS edition', async () => {
  it('should pack up', async () => {
    mockFs({
      './media-files/en/map/graphic.JPG': '',
      './media-files/en/map/graphic.eps': '',
    });

    const pack = new Pack();
    const jpg = new JPG(pack, './media-files/en/map/graphic.JPG', 'en', 'map');
    const eps = new EPS(
      pack,
      jpg,
      './media-files/en/map/graphic.eps',
      'en',
      'map'
    );

    await eps.packUp('graphics-pack/media-en-map/');

    expect(
      fs.existsSync(path.join('graphics-pack/media-en-map/EPS/graphic.eps'))
    ).toBe(true);
    expect(
      fs.existsSync(path.join('graphics-pack/media-en-map/EPS/graphic.JPG'))
    ).toBe(true);
  });
});
