import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { PNG } from './png';
import { Pack } from '../..';

afterEach(() => {
  mockFs.restore();
});

describe('PNG edition', async () => {
  it('should pack up', async () => {
    mockFs({
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
