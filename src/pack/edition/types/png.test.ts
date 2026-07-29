import { describe, it, expect } from 'vitest';
import { setProject } from '../../../__test__/project';
import path from 'path';
import fs from 'fs';
import { PNG } from './png';
import { Pack } from '../..';

describe('PNG edition', async () => {
  it('should pack up', async () => {
    setProject({
      './media-files/en/map/graphic.png': '',
    });

    const pack = new Pack();
    const png = new PNG(pack, './media-files/en/map/graphic.png', 'en', 'map');

    await png.packUp('graphics-pack/media-en-map/');

    expect(
      fs.existsSync(path.join('graphics-pack/media-en-map/PNG/graphic.png'))
    ).toBe(true);
  });
});
