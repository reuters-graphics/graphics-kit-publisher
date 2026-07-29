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
  PackageMetadataError,
  PageMetadataError,
} from '../../../exceptions/errors';
import { getLocalHTMLPageMetadata } from '../utils/getLocalPageMetadata';
import { PKG } from '../../../pkg';

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

    /**
     * Still read the page's canonical, but only to check the page has one —
     * pages without a canonical are a real error worth surfacing here.
     */
    const { ogUrl } = await getLocalHTMLPageMetadata(this.path);

    if (!ogUrl)
      throw new PageMetadataError(
        `Missing canonical link element in file: ${path.relative(context.cwd, this.path)}`,
        {
          code: 'MISSING_CANONICAL_LINK',
          hint: 'Add a <link rel="canonical"> tag to the page.',
          context: { file: path.relative(context.cwd, this.path) },
        }
      );

    /**
     * The URL clients see comes from package.json, not from the built page. The
     * project is built against a placeholder base and each archive's copy is
     * rewritten when it's packed, so the canonical in the page on disk is still
     * the placeholder at this point — writing it into a client-facing README
     * would ship an unusable URL.
     *
     * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
     */
    const embedUrl = PKG.archive(this.archive.id).url;

    if (!embedUrl)
      throw new PackageMetadataError(
        `No URL yet for archive "${this.archive.id}", needed to write "${docKey}".`,
        {
          code: 'MISSING_EDITION_URL',
          hint: 'Archives get their URL reserved from the graphics server before they are packed — run the upload command rather than packing directly.',
          context: { archive: this.archive.id, doc: docKey },
        }
      );

    const docContext = {
      embedUrl,
      embedSlug: this.archive.id,
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
          `Could not find file "${docValue}" referenced in publisher.config.ts > archiveEditions.docs settings.`,
          {
            code: 'MISSING_ARCHIVE_DOC',
            hint: 'Fix the path in your publisher config `archiveEditions.docs`, or add the missing file.',
            context: { docValue, absDocPath },
          }
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
