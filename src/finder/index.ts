import type { RNGS } from '@reuters-graphics/server-client';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import path from 'path';
import {
  EPS,
  Interactive,
  JPG,
  MediaInteractive,
  PDF,
  PNG,
} from '../pack/edition';
import slugify from 'slugify';
import { uniqBy } from 'es-toolkit';
import type { Pack } from '../pack';
import { note, spinner } from '@reuters-graphics/clack';
import picocolors from 'picocolors';

export class Finder {
  constructor(public pack: Pack) {}

  public logFound() {
    const archiveLog = this.pack.archives
      .map(
        (a) =>
          `${picocolors.cyan(a.id + '.zip')}\n- ${a.editions.map((e) => e.type).join('\n- ')}`
      )
      .join('\n\n');

    note(`${archiveLog}`, 'Your graphic pack includes:');
  }

  public async findEditions() {
    const s = spinner(1200);
    s.start('Finding archives and editions from file system');
    this._findPublicEdition();
    this._findMediaEditions();
    this._findJPGEditions();
    this._findPNGEditions();
    this._findEPSEditions();
    this._findPDFEditions();
    await s.stop('✅ Found archives and editions');
  }

  private _findEditionPaths(glob: string) {
    const editionPaths = utils.fs.glob<{
      locale: string;
      slug: string;
    }>(glob, { absolute: true, nocase: true });
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
      new Interactive(this.pack, path, locale as RNGS.Language, slug);
      new MediaInteractive(this.pack, path, locale as RNGS.Language, slug);
    }
  }

  private _findPDFEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.pdf');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new PDF(this.pack, path, locale as RNGS.Language, slug);
    }
  }

  private _findEPSEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.eps');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      const PairedImgEdition = this.pack.archives
        .find((a) => a.locale === locale && a.mediaSlug === slug)
        ?.editions.find((e) => e.type === PNG.type || e.type === JPG.type);
      // EPS editions must be accompanied by an image edition
      if (PairedImgEdition)
        new EPS(
          this.pack,
          PairedImgEdition,
          path,
          locale as RNGS.Language,
          slug
        );
    }
  }

  private _findJPGEditions() {
    const { packLocations } = context.config;
    if (!packLocations.statics) return;
    const glob = path.join(packLocations.statics, '*.jpg');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new JPG(this.pack, path, locale as RNGS.Language, slug);
    }
  }

  private _findPNGEditions() {
    if (!context.config.packLocations.statics) return;
    const glob = path.join(context.config.packLocations.statics, '*.png');
    for (const editionPath of this._findEditionPaths(glob)) {
      const { path, locale, slug } = editionPath;
      new PNG(this.pack, path, locale as RNGS.Language, slug);
    }
  }

  private _findPublicEdition() {
    if (!context.config.packLocations.dotcom) return;
    const dotcomDir = utils.fs.glob(
      path.join(context.config.packLocations.dotcom, 'index.html'),
      { absolute: true }
    )[0];
    if (dotcomDir)
      new Interactive(
        this.pack,
        dotcomDir.path,
        this.pack.metadata.language || 'en'
      );
  }
}
