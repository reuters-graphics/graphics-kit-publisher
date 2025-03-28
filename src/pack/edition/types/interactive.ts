import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import path from 'path';
import { globSync } from 'glob';
import { utils } from '@reuters-graphics/graphics-bin';
import fs from 'fs';
import { getPreviewImagePath } from '../utils/getPreviewImgPath';
import sharp from 'sharp';
import { zipDir } from '../../../utils/zipDir';
import { PackageMetadataError } from '../../../exceptions/errors';
import { context } from '../../../context';
import { serverSpinner } from '../../../server/spinner';
import picocolors from 'picocolors';
import { PKG } from '../../../pkg';

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

  /**
   * Get's the URL for this edition.
   *
   * If one hasn't been created, uploads a dummy archive to the server to fetch one.
   * @returns Edition URL
   */
  async getUrl() {
    const existingUrl = PKG.archive(this.archive.id).url;
    if (existingUrl) return existingUrl as string;

    if (
      !this.pack.metadata.id ||
      !this.pack.metadata.title ||
      !this.pack.metadata.description
    )
      throw new PackageMetadataError(
        'Must create or update graphic pack first'
      );
    if (!this.pack.serverClient)
      throw new PackageMetadataError(
        'Must create or update graphic pack first'
      );

    const { serverClient } = this.pack;

    const dummyArchive = path.join(
      context.cwd,
      `.graphics-kit/temp/${this.archive.id}`
    );
    const dummyPage = path.join(dummyArchive, 'interactive/index.html');

    utils.fs.ensureWriteFile(dummyPage, '<html></html>');

    const zipPath = await zipDir(dummyArchive);
    const fileBuffer = fs.readFileSync(zipPath);

    const editionMetadata = {
      language: this.locale as RNGS.Language,
      // Falls back to pack title/description, which the server client sends as null
      title: this.archive.metadata.title || this.pack.metadata.title,
      description:
        this.archive.metadata.description || this.pack.metadata.description,
    };

    const logArchiveId = picocolors.cyan(this.archive.id);

    serverSpinner.start(`Getting a URL for ${logArchiveId}`);
    let editions: Awaited<ReturnType<typeof serverClient.createEditions>>;

    try {
      editions = await serverClient.createEditions(
        `${this.archive.id}.zip`,
        fileBuffer,
        editionMetadata
      );
    } catch (err) {
      serverSpinner.stop(`Error getting URL for ${logArchiveId}`);
      throw err;
    }

    serverSpinner.stop(`Got URL for ${logArchiveId}`);

    const { url } = editions[`${this.archive.id}.zip`].interactive;

    /**
     * TEMP: Force graphics.reuters.com URLs from RNGS
     * to be www.reuters.com/graphics/ until RNGS gives
     * us back the correct URL.
     */
    const standardisedURL = url.replace(
      'graphics.reuters.com',
      'www.reuters.com/graphics'
    );

    PKG.archive(this.archive.id).url = standardisedURL;
    PKG.archive(this.archive.id).uploaded = new Date().toISOString();

    if (this.archive.type === 'public') {
      PKG.homepage = standardisedURL;
    }

    fs.rmSync(zipPath);
    return standardisedURL;
  }

  async packUp(archiveDir: string) {
    const cwd = path.dirname(this.path);
    const files = globSync('**/*', { cwd, nodir: true });
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
