import { describe, it, expect } from 'vitest';
import { setProject } from '../../../__test__/project';
import path from 'path';
import fs from 'fs';
import { PDF } from './pdf';
import { Pack } from '../..';

describe('PDF edition', async () => {
  it('should pack up', async () => {
    setProject({
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
