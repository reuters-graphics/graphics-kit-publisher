import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import fs from 'fs';
import { PDF } from './pdf';
import { Pack } from '../..';

afterEach(() => {
  mockFs.restore();
});

describe('PDF edition', async () => {
  it('should pack up', async () => {
    mockFs({
      './media-files/en/map/graphic.pdf': '',
    });

    const pack = new Pack();
    const pdf = new PDF(pack, './media-files/en/map/graphic.pdf', 'en', 'map');

    await pdf.packUp('graphics-pack/media-en-map/');

    expect(
      fs.existsSync(path.join('graphics-pack/media-en-map/PDF/graphic.pdf'))
    ).toBe(true);
  });
});
