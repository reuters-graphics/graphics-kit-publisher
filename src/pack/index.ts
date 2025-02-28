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
import { getClient } from '../server/client';
import { context } from '../context';
import path from 'path';
import { EPS, Interactive, JPG, MediaInteractive, PDF, PNG } from './edition';
import { isValid, pack } from '../validators';
import { note } from '@reuters-graphics/clack';
import slugify from 'slugify';
import { uniqBy } from 'es-toolkit';

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
    const client = getClient();

    if (packMetadata.id) return client.updateGraphic(packMetadata);

    await client.createGraphic(packMetadata);
    const packId = client.pack.graphic?.id;
    if (!packId)
      throw new Error('Did not get a graphic ID from the RNGS server');

    // Persist the ID
    this.metadata.id = packId;
    utils.setPkgProp('reuters.graphic.pack', packId);
  }

  async packUp() {
    this.discoverEditions();
    utils.fs.ensureDir(this.packRoot);
    for (const archive of this.archives) {
      await archive.packUp();
    }
  }

  public discoverEditions() {
    this._findPublicEdition();
    this._findMediaEditions();
    this._findJPGEditions();
    this._findPNGEditions();
    this._findEPSEditions();
    this._findPDFEditions();
  }

  private _findEditionPaths(glob: string) {
    const editionPaths = utils.fs.glob<{
      locale: string;
      slug: string;
    }>(glob, { absolute: true });
    return uniqBy(
      editionPaths.map((editionPath) => {
        const { path, params } = editionPath;
        const { locale, slug } = params;
        return {
          path,
          locale,
          slug: slugify(slug, { lower: true }),
        };
      }),
      (d) => d.locale + d.slug
    );
  }

  private _findMediaEditions() {
    if (!context.config.packLocations.embeds) return;
    const glob = path.join(context.config.packLocations.embeds, 'index.html');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new Interactive(this, path, locale as RNGS.Language, slug);
      new MediaInteractive(this, path, locale as RNGS.Language, slug);
    }
  }

  private _findPDFEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.pdf');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new PDF(this, path, locale as RNGS.Language, slug);
    }
  }

  private _findEPSEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.eps');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      const PairedImgEdition = this.archives
        .find((a) => a.locale === locale && a.mediaSlug === slug)
        ?.editions.find((e) => e.type === PNG.type || e.type === JPG.type);
      // EPS editions must be accompanied by an image edition
      if (PairedImgEdition)
        new EPS(this, PairedImgEdition, path, locale as RNGS.Language, slug);
    }
  }

  private _findJPGEditions() {
    const { packLocations } = context.config;
    if (!packLocations.statics) return;
    const glob = path.join(packLocations.statics, '*.jpg');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new JPG(this, path, locale as RNGS.Language, slug);
    }
  }

  private _findPNGEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.png');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new PNG(this, path, locale as RNGS.Language, slug);
    }
  }

  private _findPublicEdition() {
    if (!context.config.packLocations.dotcom) return;
    const dotcomDir = utils.fs.glob(
      path.join(context.config.packLocations.dotcom, 'index.html'),
      { absolute: true }
    )[0];
    if (dotcomDir)
      new Interactive(this, dotcomDir.path, this.metadata.language || 'en');
  }
}
