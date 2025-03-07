import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { JPG } from './jpg';
import { Pack } from '../..';

afterEach(() => {
  mockFs.restore();
});

describe('JPG edition', async () => {
  it('should pack up', async () => {
    mockFs({
      './media-files/en/map/graphic.JPG': '',
    });

    const pack = new Pack();
    const jpg = new JPG(pack, './media-files/en/map/graphic.JPG', 'en', 'map');

    await jpg.packUp('graphics-pack/media-en-map/');

    expect(
      fs.existsSync(path.join('graphics-pack/media-en-map/JPG/graphic.JPG'))
    ).toBe(true);
  });
});
