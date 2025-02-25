import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { getPreviewImagePath } from '../utils/getPreviewImgPath';
import { utils } from '@reuters-graphics/graphics-bin';
// import { makeGitArchive } from '../utils/makeGitArchive';

export class MediaInteractive extends Edition {
  public static type = 'media-interactive' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(MediaInteractive.type, pack, path, locale, mediaSlug);
  }

  async packUp(archiveDir: string) {
    const editionArchive = path.join(archiveDir, this.type, 'app.zip');
    utils.fs.ensureDir(editionArchive);
    // await makeGitArchive(editionArchive);
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
