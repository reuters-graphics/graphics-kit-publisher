import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { getPreviewImagePath } from '../utils/getPreviewImgPath';
import { utils } from '@reuters-graphics/graphics-bin';
import { srcArchive } from '../utils/archive';
import { context } from '../../../context';
import mustache from 'mustache';
import {
  FileNotFoundError,
  PageMetadataError,
} from '../../../exceptions/errors';
import { getLocalHTMLPageMetadata } from '../utils/getLocalPageMetadata';

export class MediaInteractive extends Edition {
  public static type = 'media-interactive' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug: string
  ) {
    super(MediaInteractive.type, pack, path, locale, mediaSlug);
  }

  async packUp(archiveDir: string) {
    const editionArchive = path.join(archiveDir, this.type, 'app.zip');
    utils.fs.ensureDir(editionArchive);
    await srcArchive.makeArchive(editionArchive);
    await this.makePreviewImage(archiveDir);
    const docFiles = Object.keys(context.config.archiveEditions.docs);
    for (const docFile of docFiles) {
      await this.makeDoc(archiveDir, docFile);
    }
  }

  private async makeDoc(archiveDir: string, docKey: string) {
    const docValue = context.config.archiveEditions.docs[docKey];

    const { ogUrl } = await getLocalHTMLPageMetadata(this.path);

    if (!ogUrl)
      throw new PageMetadataError(
        `Missing canonical link element in file: ${path.relative(context.cwd, this.path)}`
      );

    const docContext = {
      embedUrl: ogUrl,
      embedSlug: `media-${this.locale}-${this.mediaSlug}`,
      year: new Date().getFullYear().toString(),
    };

    if (typeof docValue === 'function') {
      const docString = docValue(docContext);
      utils.fs.ensureWriteFile(
        path.join(archiveDir, this.type, docKey),
        docString
      );
    } else {
      const absDocPath = utils.path.absolute(docValue, context.cwd);
      if (!fs.existsSync(absDocPath))
        throw new FileNotFoundError(
          `Could not find file "${docValue}" referenced in publisher.config.ts > archiveEditions.docs settings.`
        );
      const docString = mustache.render(
        fs.readFileSync(absDocPath, 'utf8'),
        docContext
      );
      utils.fs.ensureWriteFile(
        path.join(archiveDir, this.type, docKey),
        docString
      );
    }
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
