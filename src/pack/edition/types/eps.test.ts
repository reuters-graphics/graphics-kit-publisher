import { describe, it, expect } from 'vitest';
import { setProject } from '../../../__test__/project';
import path from 'path';
import fs from 'fs';
import { EPS } from './eps';
import { JPG } from './jpg';
import { Pack } from '../..';

describe('EPS edition', async () => {
  it('should pack up', async () => {
    setProject({
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
