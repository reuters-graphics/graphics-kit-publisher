import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import path from 'path';
import { glob } from 'glob';
import { utils } from '@reuters-graphics/graphics-bin';
import fs from 'fs';
import { getPreviewImagePath } from '../utils/getPreviewImgPath';
import sharp from 'sharp';
import { zipDir } from '../../../utils/zipDir';
import { getServerClient } from '../../../server/client';
import {
  EditionArchiveError,
  PackageMetadataError,
} from '../../../exceptions/errors';
import { context } from '../../../context';
import { spinner } from '@reuters-graphics/clack';

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
    const packageJsonEditionUrlKey = `reuters.graphic.archives.${this.archive.id}.url`;

    const existingUrl = utils.getPkgProp(packageJsonEditionUrlKey);
    if (existingUrl) return existingUrl as string;

    if (!this.pack.metadata.id)
      throw new PackageMetadataError('Must create graphic pack first');
    if (!this.archive.metadata.title || !this.archive.metadata.description)
      throw new EditionArchiveError('Must get archive metadata first');

    const serverClient = getServerClient(this.pack.metadata.id);

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
      title: this.archive.metadata.title,
      description: this.archive.metadata.description,
    };

    const s = spinner();
    s.start(`Getting a URL for ${this.archive.id}`);

    const editions = await serverClient.createEditions(
      `${this.archive.id}.zip`,
      fileBuffer,
      editionMetadata
    );

    await s.stop(`✅ Got URL for ${this.archive.id}`);

    const { url } = editions[`${this.archive.id}.zip`].interactive;

    utils.setPkgProp(packageJsonEditionUrlKey, url);

    fs.rmSync(zipPath);
    return url;
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
