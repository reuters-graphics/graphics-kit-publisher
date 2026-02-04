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
import urljoin from 'url-join';
import { PKG } from '../../../pkg';
import { addSRI } from '../../../utils/sri';
import pLimit from 'p-limit';

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

    const dummyArchivePath = path.join(
      context.cwd,
      `.graphics-kit/temp/${this.archive.id}`
    );
    const dummyPagePath = path.join(dummyArchivePath, 'interactive/index.html');

    utils.fs.ensureWriteFile(dummyPagePath, '<html></html>');

    const zipPath = await zipDir(dummyArchivePath);
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

    // Limit concurrent file operations to 10
    const limit = pLimit(10);

    await Promise.all(
      files.map((file) =>
        limit(async () => {
          const absSrc = path.join(cwd, file);

          // Add SRI attributes to media index.html files before copying
          if (
            this.archive.type === 'media' &&
            path.basename(file) === 'index.html'
          ) {
            try {
              addSRI(absSrc);
            } catch {
              // If SRI generation fails, continue without it
            }
          }

          const absDest = path.join(archiveDir, this.type, file);
          utils.fs.ensureDir(absDest);
          await fs.promises.copyFile(absSrc, absDest);
        })
      )
    );

    await this.makePreviewImage(archiveDir);
    if (this.archive.type === 'media') await this.makeManifest(archiveDir);
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

  private async makeStaticImage(archiveDir: string) {
    const previewImagePath = await getPreviewImagePath(this.path);
    const previewImgBuffer = await sharp(fs.readFileSync(previewImagePath))
      .png()
      .toBuffer();
    const staticImagePath = path.join(
      archiveDir,
      this.type,
      'statics/graphic.png'
    );
    utils.fs.ensureDir(staticImagePath);
    fs.writeFileSync(staticImagePath, previewImgBuffer);
  }

  private getEditionId() {
    const edition = this.pack.serverClient?.pack?.graphic?.editions?.find(
      (e) =>
        e.file.fileName === `${this.archive.id}.zip` &&
        e.editionName === this.type
    );
    if (!edition) return '';
    return edition.id;
  }

  private async makeManifest(archiveDir: string) {
    const editionUrl = PKG.archive(this.archive.id).url;
    if (!editionUrl)
      throw new PackageMetadataError(
        'Must get URL for interactive edition before writing manifest'
      );

    await this.makeStaticImage(archiveDir);

    const manifest = {
      pack: {
        id: this.pack.metadata.id || '',
        canonicalUrl: PKG.homepage,
        title: this.pack.metadata.title || '',
        caption: this.pack.metadata.description || '',
      },
      id: this.getEditionId(),
      rootUrl: editionUrl,
      title: this.archive.metadata.title || '',
      caption: this.archive.metadata.description || '',
      embeds: {
        url: editionUrl,
        embedCode: {
          declaration: this.archive.metadata.embed?.declaration || '',
          dependencies: this.archive.metadata.embed?.dependencies || '',
        },
        image: {
          id: '',
          url: urljoin(editionUrl, 'statics/graphic.png'),
        },
      },
    };

    fs.writeFileSync(
      path.join(archiveDir, this.type, 'manifest.json'),
      JSON.stringify(manifest)
    );
  }
}
