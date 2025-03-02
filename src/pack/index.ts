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
import { note } from '@reuters-graphics/clack';
import { spinner } from '@reuters-graphics/clack';
import { Finder } from '../finder';
import { buildForProduction } from '../build';

export class Pack {
  public metadata: Partial<PackMetadata> = {};
  public archives: Archive[] = [];
  public packRoot = '.graphics-kit/pack/' as const;

  private async getMetadata() {
    if (isValid(pack.Metadata, this.metadata))
      return this.metadata as PackMetadata;

    note(
      'Please answer a few questions to fill in metadata for this graphics pack.',
      'Pack metadata'
    );

    this.metadata.id = utils.getPkgProp('reuters.graphic.id');
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
    const serverClient = getServerClient();
    const s = spinner();

    if (packMetadata.id) {
      s.start('Updating graphic pack');
      await serverClient.updateGraphic(packMetadata);
      return s.stop('✅ Updated graphic pack');
    }
    s.start('Creating a graphic pack');
    await serverClient.createGraphic(packMetadata);
    await s.stop('✅ Created graphic pack');

    const packId = serverClient.pack.graphic?.id;
    if (!packId)
      throw new Error('Did not get a graphic ID from the graphics server');

    // Persist the ID
    this.metadata.id = packId;
    utils.setPkgProp('reuters.graphic.pack', packId);
  }

  public async upload() {
    await this.getMetadata();
    await this.createOrUpdate();
    buildForProduction();
    const finder = new Finder(this);
    finder.findEditions();
    finder.logFound();
    for (const archive of this.archives) {
      await archive.getMetadata();
    }
    buildForProduction();
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
}
