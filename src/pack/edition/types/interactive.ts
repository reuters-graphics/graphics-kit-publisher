import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import path from 'path';
import { glob } from 'glob';
import { utils } from '@reuters-graphics/graphics-bin';
import fs from 'fs';
import { getPreviewImagePath } from '../utils/getPreviewImgPath';
import sharp from 'sharp';

export class Interactive extends Edition {
  public static type = 'interactive' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(Interactive.type, pack, path, locale, mediaSlug);
  }

  async packUp(archiveDir: string) {
    const cwd = path.dirname(this.path);
    const files = glob.sync('**/*', { cwd, nodir: true });
    for (const file of files) {
      const absSrc = path.join(cwd, file);
      const absDest = path.join(archiveDir, this.type, file);
      utils.fs.ensureDir(absDest);
      fs.copyFileSync(absSrc, absDest);
    }
    await this.makePreviewImage(archiveDir);
  }

  private async makePreviewImage(archiveDir: string) {
    const previewImagePath = await getPreviewImagePath(this.path);
    const previewImgBuffer = await sharp(fs.readFileSync(previewImagePath))
      .png()
      .toBuffer();
    fs.writeFileSync(
      path.join(archiveDir, this.type, '_gfxpreview.png'),
      previewImgBuffer
    );
  }
}
