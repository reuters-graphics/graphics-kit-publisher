import type {
  Graphic,
  Publishing,
  RNGS,
} from '@reuters-graphics/server-client';
import { Archive } from './archive';
import {
  byline,
  contactEmail,
  description,
  desk,
  language,
  type PackMetadata,
  rootSlug,
  title,
  wildSlug,
} from './metadata';
import { utils } from '@reuters-graphics/graphics-bin';
import { getServerClient } from '../server/client';
import { getServerCredentials } from '../server/credentials';
import { archiveEdition, isValid, pack, validateOrThrow } from '../validators';
import { spinner } from '@reuters-graphics/clack';
import { Finder } from '../finder';
import { buildForProduction } from '../build';
import { log, note } from '@clack/prompts';
import { confirm, select } from '../prompts';
import { serverSpinner } from '../server/spinner';
import { PKG } from '../pkg';
import { getConnectOptions, getLynxOptions } from './publishOptions';
import { multiselect } from '../prompts/multiselect';
import picocolors from 'picocolors';
import { SeparateAssets } from '../separateAssets';
import { selectArchives } from './selection';

export class Pack {
  public metadata: Partial<PackMetadata> = {};
  public archives: Archive[] = [];
  public packRoot = '.graphics-kit/pack/' as const;
  public serverClient?: ReturnType<typeof getServerClient>;
  private separateAssets = new SeparateAssets();
  /**
   * Whether this run created the pack, in which case its metadata is already on
   * the server and the later update would be a wasted round-trip.
   */
  private createdThisRun = false;
  /** Set once the user (or `--archives`) has chosen. */
  private selectedArchives?: Archive[];

  private suffix(value: string, suffix = ':') {
    const val = value.trim();
    return val.endsWith(suffix) ? val : val + suffix;
  }

  private async getMetadata() {
    if (isValid(pack.Metadata, this.metadata))
      return this.metadata as PackMetadata;

    this.metadata.id = PKG.pack.id;
    this.metadata.desk = (await desk()) as Graphic.Desk;
    this.metadata.rootSlug = await rootSlug();
    this.metadata.wildSlug = await wildSlug();
    this.metadata.language = (await language()) as RNGS.Language;
    this.metadata.title = this.suffix(await title());
    this.metadata.description = this.suffix(description());
    this.metadata.byline = await byline();
    this.metadata.contactEmail = await contactEmail();
    return this.metadata as PackMetadata;
  }

  public getOrCreateArchive(locale: RNGS.Language, mediaSlug?: string) {
    const existingArchive = this.archives.find(
      (archive) => archive.mediaSlug === mediaSlug && archive.locale === locale
    );
    if (existingArchive) return existingArchive;
    return new Archive(this, locale, mediaSlug);
  }

  /**
   * Make sure the pack exists on the server, so its ID is available.
   *
   * A no-op for any project that has been uploaded before, which is why the
   * single interactive phase survives: only a first-ever upload prompts for pack
   * metadata here, ahead of the build. It can't wait, because the ID is baked
   * into the build — the separate-assets download URL is derived from it, and
   * unlike a base URL it's one value per project, so it isn't rewritten.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   */
  public async ensurePackId() {
    if (PKG.pack.id) {
      this.metadata.id = PKG.pack.id;
      return PKG.pack.id;
    }
    await this.createOrUpdate();
    this.createdThisRun = true;
    return PKG.pack.id;
  }

  /**
   * Create or update a Sphinx Graphics Pack
   */
  public async createOrUpdate() {
    const packMetadata = await this.getMetadata();
    this.serverClient = getServerClient(packMetadata.id);

    serverSpinner.start();
    try {
      if (packMetadata.id) {
        await this.serverClient.updateGraphic(packMetadata);
        return serverSpinner.stop('Updated graphic pack');
      }
      await this.serverClient.createGraphic(packMetadata);
      serverSpinner.stop('Created graphic pack');
    } catch (err) {
      serverSpinner.stop('Error creating or updating graphic pack');
      throw err;
    }

    const packId = this.serverClient.pack.graphic?.id;
    if (!packId)
      throw new Error('Did not get a graphic ID from the graphics server');

    // Persist the ID
    this.metadata.id = packId;
    PKG.pack.id = packId;
  }

  /**
   * Upload the pack, in phases: everything the user has to answer happens in one
   * place, before anything is uploaded.
   *
   * The old order interleaved them — it discovered archives, then prompted for
   * each one's metadata while reserving its URL, so a newly added embed asked for
   * a title minutes into a run, between server round-trips that take 2–5 minutes
   * each. Now the run is unattended once the collect phase is done.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   * @param publicOnly Only upload the public archive
   */
  public async upload(publicOnly = false, requestedArchives?: string[]) {
    // Phase 0 — preflight: fail on anything knowable before doing work.
    getServerCredentials();
    await this.ensurePackId();
    this.separateAssets.setUrl();

    /**
     * Phase 1 — one build, against a placeholder base URL. There used to be a
     * second one after URLs were reserved: the first discovered which archives
     * existed, the second baked their URLs in. Each archive's copy of this output
     * is rewritten to its own URL when it's packed instead.
     */
    await buildForProduction();

    // Phase 2 — discover what's in the build.
    const finder = new Finder(this);
    finder.findEditions(publicOnly);
    finder.logFound();

    // Phase 3 — the only interactive phase: what to upload, then its metadata.
    await this.collectMetadata(requestedArchives);

    // Phase 4 — reserve a URL per archive, and render embed codes from them.
    await this.reserveArchiveUrls();

    // Phase 5 — stage and zip.
    await this.packUp();

    // Phase 6 — upload.
    for (const archive of this.selected) {
      await archive.createOrUpdate();
    }
    if (!publicOnly) await this.separateAssets.packAndUpload();
  }

  /**
   * Phase 3 — collect and validate everything the user can answer, then show what
   * the rest of the run will do.
   *
   * Validation is deliberate rather than incidental: the metadata schemas used to
   * be consulted only as caching short-circuits, so a bad value (a non-Reuters
   * contact email read from a profile, say) reached the server rather than failing
   * here.
   */
  private async collectMetadata(requestedArchives?: string[]) {
    /**
     * Selection comes first so nothing is asked about an archive that isn't
     * being uploaded — and so a mistyped `--archives` value fails before a
     * single prompt.
     */
    this.selectedArchives = await selectArchives({
      archives: this.archives,
      requested: requestedArchives,
    });

    const packMetadata = await this.getMetadata();
    validateOrThrow(pack.Metadata, packMetadata);

    for (const archive of this.selected) {
      validateOrThrow(archiveEdition.Metadata, await archive.collectMetadata());
    }

    this.logPlan();
  }

  /** The archives this run will upload. Everything, until a selection is made. */
  private get selected() {
    return this.selectedArchives ?? this.archives;
  }

  /** Summarise what the unattended part of the run is about to do. */
  private logPlan() {
    const rows = this.selected.map((archive) => {
      const status = PKG.archive(archive.id).uploaded ? 'update' : 'new';
      return `${picocolors.cyan(archive.id)} ${picocolors.dim(status)}`;
    });
    const skipped = this.archives.filter(
      (archive) => !this.selected.includes(archive)
    );
    if (skipped.length)
      rows.push(
        picocolors.dim(
          `\nSkipping ${skipped.map((a) => a.id).join(', ')} — still served from their own archives.`
        )
      );
    note(rows.join('\n'), 'Uploading');
  }

  /**
   * Phase 4 — give every archive that needs one a URL from the graphics server,
   * then render its embed code.
   *
   * Reserving a URL means uploading a placeholder zip, which is how the server
   * hands one back. Archives that already have a URL keep it: it's the archive's
   * address, stable for the life of the project.
   */
  private async reserveArchiveUrls() {
    // Skipped on a first upload: Phase 0 just created the pack with this exact
    // metadata, so pushing it again would be a wasted round-trip.
    if (!this.createdThisRun) await this.createOrUpdate();

    for (const archive of this.selected) {
      const edition = archive.interactiveEdition;
      if (!edition) continue;
      archive.setEmbedMetadata(await edition.getUrl());
    }
  }

  async packUp() {
    const s = spinner(2000);
    s.start('Packing up graphic pack');
    try {
      utils.fs.ensureDir(this.packRoot);
      for (const archive of this.selected) {
        await archive.packUp();
      }
      await s.stop('📦 All packed.');
    } catch (error) {
      // Stop the spinner on failure so it doesn't keep animating under the
      // rendered error and the AI-handoff prompt. Rethrow so the failure still
      // reaches the CLI error boundary.
      await s.stop('Could not finish packing up.', 2);
      throw error;
    }
  }

  async resetPackData(askToConfirm = true) {
    const confirmed =
      askToConfirm ?
        await confirm({
          message:
            'This will reset your pack, which means uploading again will create a new one in the graphics server. Are you sure?',
        })
      : true;
    if (!confirmed) return;
    const archives = Object.keys(PKG.pack.archives || {});
    // Reset pack ID
    PKG.pack.id = '';
    // Reset all URLs
    PKG.homepage = '';
    PKG.pack.published = '';
    PKG.pack.updated = '';
    for (const archiveId of archives) {
      PKG.archive(archiveId).url = '';
      PKG.archive(archiveId).uploaded = '';
    }
  }

  async delete() {
    this.metadata.id = PKG.pack.id;
    if (!this.metadata.id) {
      log.error(
        "Can't find an ID for this graphic pack to delete it. Have you uploaded the pack yet?"
      );
      return;
    }
    const serverClient = getServerClient(this.metadata.id);
    const confirmed = await confirm({
      message: 'Are you sure you want to delete this pack?',
    });
    if (!confirmed) return;
    serverSpinner.start();
    try {
      await serverClient.deleteGraphic();
      if (!serverClient.pack.hasGraphic) {
        serverSpinner.stop('Deleted pack');
        await this.resetPackData(false);
      } else {
        serverSpinner.stop('Unable to delete');
      }
    } catch {
      serverSpinner.stop('Unable to delete');
    }
  }

  private setPublishTimes() {
    if (!PKG.pack.published) PKG.pack.published = new Date().toISOString();
    PKG.pack.updated = new Date().toISOString();
  }

  async publish() {
    const id = PKG.pack.id;
    const archives = PKG.pack.archives;

    if (!id || !archives) {
      log.warn('No archives found to publish. Have you uploaded yet?');
      return;
    }

    const serverClient = getServerClient(id);

    const isCi = utils.environment.isCiEnvironment();

    const revisionType =
      isCi ? 'Refresh' : (
        ((await select({
          message: 'What type of update are you publishing?',
          options: [
            {
              label: 'Refresh',
              value: 'Refresh',
              hint: 'Updates code or fixes a superficial typo',
            },
            { label: 'Update', value: 'Update', hint: 'Adds new information' },
            {
              label: 'Correction',
              value: 'Correction',
              hint: 'Corrects an error',
            },
          ],
          initialValue: 'Refresh',
        })) as Publishing.PublishRevisionType)
      );

    const lynxOptions = getLynxOptions();
    const connectOptions = getConnectOptions();

    if (isCi) {
      await serverClient.publishGraphic(
        [],
        connectOptions,
        lynxOptions,
        revisionType
      );
      this.setPublishTimes();
      return;
    }

    const selectedForLynx =
      lynxOptions.length > 0 ?
        await multiselect({
          message: 'Which editions should be searchable in Lynx?',
          options: lynxOptions.map((archiveEdition) => ({
            value: JSON.stringify(archiveEdition),
            label: archiveEdition[1],
            hint: archiveEdition[0],
          })),
          initialValues: lynxOptions.map((archiveEdition) =>
            JSON.stringify(archiveEdition)
          ),
          required: false,
        })
      : [];

    const editionsToLynx = selectedForLynx.map((selected) => {
      return lynxOptions.find(
        (archiveEdition) => JSON.stringify(archiveEdition) === selected
      )!;
    });

    const selectedForConnect =
      connectOptions.length > 0 ?
        await multiselect({
          message: 'Which editions should be available on Reuters Connect?',
          options: connectOptions.map((archiveEdition) => ({
            value: JSON.stringify(archiveEdition),
            label: archiveEdition[1],
            hint: archiveEdition[0],
          })),
          initialValues: connectOptions.map((archiveEdition) =>
            JSON.stringify(archiveEdition)
          ),
          required: false,
        })
      : [];

    if (selectedForConnect.length > 0) {
      const bloodOath = await confirm({
        message: `Have you confirmed the editions you're sending to Connect work as embeds in a preview?`,
        initialValue: false,
      });
      if (!bloodOath) {
        log.error(
          `💀 ${picocolors.red(picocolors.bold('Always check your embeds.'))} Try publishing again after you have.`
        );
        return;
      }
    }

    const editionsToConnect = selectedForConnect.map((selected) => {
      return connectOptions.find(
        (archiveEdition) => JSON.stringify(archiveEdition) === selected
      )!;
    });

    serverSpinner.start();
    try {
      await serverClient.publishGraphic(
        [],
        editionsToConnect,
        editionsToLynx,
        revisionType
      );
      serverSpinner.stop('Published graphic pack');
    } catch (err) {
      serverSpinner.stop('Error publishing graphic pack');
      throw err;
    }

    this.setPublishTimes();

    if (PKG.homepage) log.info(`🏠 ${picocolors.cyan(PKG.homepage)}`);
  }
}
