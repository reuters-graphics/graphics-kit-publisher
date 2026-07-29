import type { RNGS } from '@reuters-graphics/server-client';
import type { Edition, Interactive } from '../edition';
import type { Pack } from '..';
import { description, title, type ArchiveEditionsMetadata } from './metadata';
import { isValid, archiveEdition, validateOrThrow } from '../../validators';
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

  /**
   * The directory this archive's page lives in, which `edition.*` metadata
   * pointers resolve against. The interactive edition is the archive's page;
   * statics-only archives fall back to wherever their first edition sits.
   */
  public get editionRoot() {
    const edition = this.interactiveEdition ?? this.editions[0];
    return edition ?
        path.dirname(utils.path.absolute(edition.path))
      : context.cwd;
  }

  public get interactiveEdition() {
    return this.editions.find((e) => e.type === 'interactive') as
      | Interactive
      | undefined;
  }

  /**
   * Everything about this archive we can ask the user or read from the project —
   * and nothing that needs a server round-trip.
   *
   * Split from the URL-dependent half ({@link setEmbedMetadata}) so all prompting
   * happens in one phase, before any upload starts. It used to reserve the
   * archive's URL inline, which meant a new embed's title prompt appeared in the
   * middle of a long serial upload.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   */
  public async collectMetadata() {
    if (isValid(archiveEdition.Metadata, this.metadata))
      return this.metadata as ArchiveEditionsMetadata;

    this.metadata.language = this.locale as RNGS.Language;

    // Public archive takes the same title and description as the pack
    if (this.type === 'public') {
      this.metadata.title = this.pack.metadata.title;
      this.metadata.description = this.pack.metadata.description;
    } else {
      // Falls back to pack title/description, which the server client sends as null
      this.metadata.title = (await title(this)) || this.pack.metadata.title;
      this.metadata.description =
        (await description(this)) || this.pack.metadata.description;
    }

    return this.metadata as ArchiveEditionsMetadata;
  }

  /**
   * Render this archive's embed code, which can only be done once the archive
   * has a URL. No prompting, no filesystem work.
   */
  public setEmbedMetadata(embedUrl: string) {
    const embedContext = { embedUrl, embedSlug: this.id };
    this.metadata.embed = {
      declaration: context.config.embedTemplate.declaration(embedContext),
      dependencies: context.config.embedTemplate.dependencies(embedContext),
    };
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
      throw new PackageMetadataError('Must create graphic pack first', {
        code: 'PACK_NOT_CREATED',
        hint: 'Run the upload step (which creates the pack) before this operation.',
      });
    const { serverClient } = this.pack;
    /**
     * Metadata is collected in one earlier phase and the embed code filled in
     * once the URL exists, so by here there's nothing left to ask or fetch.
     */
    const metadata = validateOrThrow(
      archiveEdition.Metadata,
      this.metadata
    ) as ArchiveEditionsMetadata;
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
