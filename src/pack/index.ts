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
import { isValid, pack } from '../validators';
import { spinner } from '@reuters-graphics/clack';
import { Finder } from '../finder';
import { buildForProduction } from '../build';
import { log } from '@clack/prompts';
import { confirm, select } from '../prompts';
import { serverSpinner } from '../server/spinner';
import { PKG } from '../pkg';
import { getConnectOptions, getLynxOptions } from './publishOptions';
import { multiselect } from '../prompts/multiselect';
import picocolors from 'picocolors';
import { SeparateAssets } from '../separateAssets';

export class Pack {
  public metadata: Partial<PackMetadata> = {};
  public archives: Archive[] = [];
  public packRoot = '.graphics-kit/pack/' as const;
  public serverClient?: ReturnType<typeof getServerClient>;
  private separateAssets = new SeparateAssets();

  private async getMetadata() {
    if (isValid(pack.Metadata, this.metadata))
      return this.metadata as PackMetadata;

    this.metadata.id = PKG.pack.id;
    this.metadata.desk = (await desk()) as Graphic.Desk;
    this.metadata.rootSlug = await rootSlug();
    this.metadata.wildSlug = await wildSlug();
    this.metadata.language = (await language()) as RNGS.Language;
    this.metadata.title = await title();
    this.metadata.description = await description();
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
   * @param publicOnly Only upload the public archive
   */
  public async upload(publicOnly = false) {
    await this.getMetadata();
    await this.createOrUpdate();

    this.separateAssets.setUrl();

    await buildForProduction();
    const finder = new Finder(this);
    finder.findEditions(publicOnly);
    finder.logFound();
    for (const archive of this.archives) {
      await archive.getMetadata();
    }
    await buildForProduction();
    await this.packUp();
    for (const archive of this.archives) {
      await archive.createOrUpdate();
    }
    if (!publicOnly) await this.separateAssets.packAndUpload();
  }

  async packUp() {
    const s = spinner(2000);
    s.start('Packing up graphic pack');
    utils.fs.ensureDir(this.packRoot);
    for (const archive of this.archives) {
      await archive.packUp();
    }
    await s.stop('📦 All packed.');
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
