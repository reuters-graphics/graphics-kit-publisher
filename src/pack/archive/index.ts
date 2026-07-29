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
import { BuildError, PackageMetadataError } from '../../exceptions/errors';
import {
  assertNoResidualTokens,
  deriveMappings,
  rewriteDir,
} from '../../rewrite';
import { PLACEHOLDER_BASE } from '../../constants/rewrite';
import { addSRI } from '../../utils/sri';
import { serverSpinner } from '../../server/spinner';
import picocolors from 'picocolors';
import { PKG } from '../../pkg';

type ArchiveType = 'public' | 'media';

export class Archive {
  public editions: Edition[] = [];
  /** Path to this archive's zip, set when it's packed. */
  private zipPath?: string;
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
   * Pack up all editions, rewrite them to this archive's own URL, and zip.
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
    this.rewriteToOwnUrl(archiveDir);
    this.zipPath = await zipDir(archiveDir);
    return this.zipPath;
  }

  /**
   * Point this archive's staged copy of the build at its own URL.
   *
   * The project is built once against a placeholder base, so this is where an
   * archive stops sharing the public archive's assets and starts serving its
   * own — which is what makes it safe to re-upload one archive without
   * re-uploading the rest.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   */
  private rewriteToOwnUrl(archiveDir: string) {
    const edition = this.interactiveEdition;
    // Statics-only archives have no page and no URL, so nothing to rewrite.
    if (!edition) return;

    const archiveUrl = PKG.archive(this.id).url;
    if (!archiveUrl)
      throw new PackageMetadataError(
        `No URL yet for archive "${this.id}", needed before it can be packed.`,
        {
          code: 'MISSING_EDITION_URL',
          hint: 'Archives get a URL reserved from the graphics server before packing — run the upload command rather than packing directly.',
          context: { archive: this.id },
        }
      );

    /**
     * Where this archive's page sat in the build, so references to it can collapse
     * to the archive root it's been hoisted to. Empty for the public archive,
     * whose page is already the build root.
     */
    const buildRoot = path.join(context.cwd, context.config.build.outDir);
    const hoistedPath = path.relative(
      buildRoot,
      path.dirname(utils.path.absolute(edition.path))
    );

    const report = rewriteDir(
      archiveDir,
      deriveMappings({
        placeholderBase: PLACEHOLDER_BASE,
        archiveUrl,
        hoistedPath: hoistedPath || undefined,
      })
    );

    /**
     * Nothing replaced means the build never saw the placeholder — the app
     * resolved a real base URL instead, most likely because the copy of this
     * library it built against predates the placeholder. Every archive would
     * quietly ship pointing at the public archive, which is the coupling this
     * work exists to remove, so fail rather than upload that.
     */
    if (report.total === 0)
      throw new BuildError(
        `Found no base URL to rewrite in the "${this.id}" archive.`,
        {
          code: 'NO_PLACEHOLDER_IN_BUILD',
          hint: "The build didn't use the publisher's placeholder base URL. Check that the project's page builder gets its base path from this package's `getBasePath`, and that the publisher and the app resolve the same version of it.",
          context: { archive: this.id, archiveUrl },
        }
      );

    assertNoResidualTokens(archiveDir);

    /**
     * SRI last: it hashes the asset files, so it has to run after their contents
     * are final. It also has to run on this staged copy rather than on the build
     * output, since every archive's copy differs.
     */
    if (this.type === 'media') {
      try {
        addSRI(path.join(archiveDir, edition.type, 'index.html'));
      } catch {
        // If SRI generation fails, continue without it
      }
    }
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
    /**
     * Uses the zip the packing phase produced rather than packing again. This
     * used to re-pack every archive from scratch — `zipDir` deletes its staging
     * directory, so the second pass redid every copy, every rewrite, every
     * `sharp` preview render and every SRI hash.
     */
    const zipPath = this.zipPath ?? (await this.packUp());
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
