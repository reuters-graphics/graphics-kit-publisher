import type { RNGS } from '@reuters-graphics/server-client';
import type { Edition, Interactive } from '../edition';
import type { Pack } from '..';
import { description, title, type ArchiveEditionsMetadata } from './metadata';
import { isValid, archiveEdition } from '../../validators';
import path from 'path';
import fs from 'fs';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../../context';
import { zipDir } from '../../utils/zipDir';
import { PackageMetadataError } from '../../exceptions/errors';
import { serverSpinner } from '../../server/spinner';
import picocolors from 'picocolors';
import { PKG } from '../../pkg';

type ArchiveType = 'public' | 'media';

export class Archive {
  public editions: Edition[] = [];
  public metadata: Partial<ArchiveEditionsMetadata> = {};
  public type: ArchiveType;
  constructor(
    public pack: Pack,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    this.type = mediaSlug ? 'media' : 'public';
    pack.archives.push(this);
  }

  public get id() {
    if (this.type === 'public') return this.type;
    return `${this.type}-${this.locale}-${this.mediaSlug}`;
  }

  public async getMetadata() {
    if (isValid(archiveEdition.Metadata, this.metadata))
      return this.metadata as ArchiveEditionsMetadata;

    this.metadata.language = this.locale as RNGS.Language;

    // Public archive takes the same title and description as the pack
    if (this.type === 'public') {
      this.metadata.title = this.pack.metadata.title;
      this.metadata.description = this.pack.metadata.description;
    } else {
      this.metadata.title = await title(this);
      this.metadata.description = await description(this);
    }

    /**
     * Get a URL if there's an interactive edition
     */
    const interactiveEdition = this.editions.find(
      (e) => e.type === 'interactive'
    ) as Interactive | undefined;

    if (interactiveEdition) {
      const url = await interactiveEdition.getUrl();
      const embedContext = {
        embedUrl: url,
        embedSlug: this.id,
      };
      this.metadata.embed = {
        declaration: context.config.embedTemplate.declaration(embedContext),
        dependencies: context.config.embedTemplate.dependencies(embedContext),
      };
    }
    return this.metadata as ArchiveEditionsMetadata;
  }

  /**
   * Pack up all editions and zip the archive directory
   * @returns The path to the zipped archive
   */
  async packUp() {
    const archiveDir = path.join(
      utils.path.absolute(this.pack.packRoot),
      this.id
    );
    if (!fs.existsSync(archiveDir))
      fs.mkdirSync(archiveDir, { recursive: true });
    for (const edition of this.editions) {
      await edition.packUp(archiveDir);
    }
    return zipDir(archiveDir);
  }

  async createOrUpdate() {
    if (!this.pack.serverClient)
      throw new PackageMetadataError('Must create graphic pack first');
    const { serverClient } = this.pack;
    const metadata = await this.getMetadata();
    const zipPath = await this.packUp();
    const zipBuffer = fs.readFileSync(zipPath);

    const hasBeenUploaded = PKG.archive(this.id).uploaded;

    const logId = picocolors.cyan(this.id);
    try {
      if (!hasBeenUploaded) {
        serverSpinner.start(`Creating archive ${logId}`);
        await serverClient.createEditions(
          `${this.id}.zip`,
          zipBuffer,
          metadata
        );
        serverSpinner.stop(`Created archive ${logId}`);
      } else {
        serverSpinner.start(`Updating archive ${logId}`);
        await serverClient.updateEditions(
          `${this.id}.zip`,
          zipBuffer,
          metadata
        );
        serverSpinner.stop(`Updated archive ${logId}`);
      }
    } catch (err) {
      serverSpinner.stop(`Error creating or updating archive ${logId}`);
      throw err;
    }

    PKG.archive(this.id).uploaded = new Date().toISOString();
    PKG.archive(this.id).editions = this.editions.map((e) => e.type);
  }
}
