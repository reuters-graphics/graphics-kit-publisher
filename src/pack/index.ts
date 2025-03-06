import type { Graphic, RNGS } from '@reuters-graphics/server-client';
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
import { confirm } from '../prompts';
import { serverSpinner } from '../server/spinner';
import { PKG } from '../pkg';

export class Pack {
  public metadata: Partial<PackMetadata> = {};
  public archives: Archive[] = [];
  public packRoot = '.graphics-kit/pack/' as const;
  public serverClient?: ReturnType<typeof getServerClient>;

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
    if (packMetadata.id) {
      await this.serverClient.updateGraphic(packMetadata);
      return serverSpinner.stop('Updated graphic pack');
    }
    await this.serverClient.createGraphic(packMetadata);
    serverSpinner.stop('Created graphic pack');

    const packId = this.serverClient.pack.graphic?.id;
    if (!packId)
      throw new Error('Did not get a graphic ID from the graphics server');

    // Persist the ID
    this.metadata.id = packId;
    PKG.pack.id = packId;
  }

  public async upload() {
    await this.getMetadata();
    await this.createOrUpdate();
    await buildForProduction();
    const finder = new Finder(this);
    finder.findEditions();
    finder.logFound();
    for (const archive of this.archives) {
      await archive.getMetadata();
    }
    await buildForProduction();
    await this.packUp();
    for (const archive of this.archives) {
      await archive.createOrUpdate();
    }
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
}
