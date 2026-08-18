import { utils } from '@reuters-graphics/graphics-bin';
import { dotPaths } from './dotPaths';
import type { Pkg, PkgPreview } from './types';
import { previewKeyFromUrl } from '../utils/previewKey';

type Graphic = Pkg['reuters']['graphic'];

/**
 * Rewrite a legacy string `reuters.preview` into `{ root, branches }`.
 *
 * Called before every preview **write** — and it isn't belt-and-braces. The
 * dot-path setter is es-toolkit's `set`, which throws
 * `TypeError: Cannot create property 'branches' on string` when an intermediate
 * value is a primitive. So without this, the first `preview` run on any project
 * predating the `{ root, branches }` shape crashes on an opaque type error.
 *
 * Never called on reads, so loading a config file can't mutate `package.json`
 * (see `getBasePath` in `src/basePaths.ts`). Reads don't need it: `get` on a
 * string intermediate returns `undefined`, so a legacy project simply reads as
 * one that has never been previewed.
 *
 * The legacy value is a full URL, so it becomes the root by way of its pathname.
 * An unparseable one is dropped rather than stored, leaving the caller to mint a
 * fresh root.
 */
const migrateLegacyPreview = () => {
  const preview: unknown = utils.getPkgProp(dotPaths.preview.self);
  if (typeof preview !== 'string') return;
  const root = previewKeyFromUrl(preview);
  utils.setPkgProp(
    dotPaths.preview.self,
    root ? { root, branches: {} } : { branches: {} }
  );
};

/** One branch's preview. Mirrors {@link Archive}, keyed by branch slug. */
class PreviewBranch {
  constructor(private slug: string) {}
  /** Fully specified, openable preview URL. */
  get url(): string | undefined {
    return utils.getPkgProp(dotPaths.preview.branch.url(this.slug));
  }
  set url(url: string) {
    migrateLegacyPreview();
    utils.setPkgProp(dotPaths.preview.branch.url(this.slug), url);
  }
}

/** The project's previews: one shared root, one entry per branch. */
class Preview {
  /**
   * S3 key prefix, e.g. `testfiles/2026/ab12cd34ef56/`. Returns exactly what's
   * stored — no composing a URL on the way out, so there's one obvious mapping
   * in each direction.
   */
  get root(): PkgPreview['root'] | undefined {
    /**
     * A legacy `reuters.preview` is a bare URL string, and that URL *is* the
     * root. Derived here rather than rewritten, so reading stays read-only — the
     * rewrite happens on the next write, via {@link migrateLegacyPreview}, which
     * derives it the same way. Without this, minting would see no root, invent a
     * new one, and discard the project's existing preview prefix.
     */
    const stored: unknown = utils.getPkgProp(dotPaths.preview.self);
    if (typeof stored === 'string') return previewKeyFromUrl(stored);
    return utils.getPkgProp(dotPaths.preview.root);
  }
  set root(key: PkgPreview['root']) {
    migrateLegacyPreview();
    utils.setPkgProp(dotPaths.preview.root, key);
  }
  /** Every branch's preview URL. Mirrors `PKG.pack.archives`. */
  get branches(): PkgPreview['branches'] {
    return utils.getPkgProp(dotPaths.preview.branches) ?? {};
  }
  /** One branch's preview. Mirrors `PKG.archive(id)`. */
  branch(slug: string) {
    return new PreviewBranch(slug);
  }
  /**
   * Empty `branches`, leaving `root` in place — `publish` deletes the objects but
   * keeps the pointer, so the next preview reuses the same prefix instead of
   * minting a new one.
   */
  clearBranches() {
    migrateLegacyPreview();
    utils.setPkgProp(dotPaths.preview.branches, {});
  }
}

class Pack {
  get id(): Graphic['pack'] | undefined {
    return utils.getPkgProp(dotPaths.pack.id);
  }
  set id(id: Graphic['pack']) {
    utils.setPkgProp(dotPaths.pack.id, id);
  }
  get rootSlug(): Graphic['slugs']['root'] | undefined {
    return utils.getPkgProp(dotPaths.pack.slugs.root);
  }
  set rootSlug(slug: Graphic['slugs']['root']) {
    utils.setPkgProp(dotPaths.pack.slugs.root, slug);
  }
  get wildSlug(): Graphic['slugs']['wild'] | undefined {
    return utils.getPkgProp(dotPaths.pack.slugs.wild);
  }
  set wildSlug(slug: Graphic['slugs']['wild']) {
    utils.setPkgProp(dotPaths.pack.slugs.wild, slug);
  }
  get language(): Graphic['language'] | undefined {
    return utils.getPkgProp(dotPaths.pack.language);
  }
  set language(language: Graphic['language']) {
    utils.setPkgProp(dotPaths.pack.language, language);
  }
  get desk(): Graphic['desk'] | undefined {
    return utils.getPkgProp(dotPaths.pack.desk);
  }
  set desk(desk: Graphic['desk']) {
    utils.setPkgProp(dotPaths.pack.desk, desk);
  }
  get contactEmail(): Graphic['contactEmail'] | undefined {
    return utils.getPkgProp(dotPaths.pack.contactEmail);
  }
  set contactEmail(contactEmail: Graphic['contactEmail']) {
    utils.setPkgProp(dotPaths.pack.contactEmail, contactEmail);
  }
  get title(): Graphic['title'] | undefined {
    return utils.getPkgProp(dotPaths.pack.title);
  }
  set title(title: Graphic['title']) {
    utils.setPkgProp(dotPaths.pack.title, title);
  }
  get description(): Graphic['description'] | undefined {
    return utils.getPkgProp(dotPaths.pack.description);
  }
  set description(description: Graphic['description']) {
    utils.setPkgProp(dotPaths.pack.description, description);
  }
  get published(): Graphic['published'] | undefined {
    return utils.getPkgProp(dotPaths.pack.published);
  }
  set published(published: Graphic['published']) {
    utils.setPkgProp(dotPaths.pack.published, published);
  }
  get updated(): Graphic['updated'] | undefined {
    return utils.getPkgProp(dotPaths.pack.updated);
  }
  set updated(updated: Graphic['updated']) {
    utils.setPkgProp(dotPaths.pack.updated, updated);
  }
  get authors(): Graphic['authors'] | undefined {
    return utils.getPkgProp(dotPaths.pack.authors);
  }
  set authors(authors: Graphic['authors']) {
    utils.setPkgProp(dotPaths.pack.authors, authors);
  }
  get archives(): Graphic['archives'] | undefined {
    return utils.getPkgProp(dotPaths.pack.archives);
  }
  set archives(archives: Graphic['archives']) {
    utils.setPkgProp(dotPaths.pack.archives, archives);
  }
}

class Archive {
  constructor(private id: string) {}
  get url(): Graphic['archives'][string]['url'] | undefined {
    return utils.getPkgProp(dotPaths.archives.url(this.id));
  }
  set url(id: Graphic['archives'][string]['url']) {
    utils.setPkgProp(dotPaths.archives.url(this.id), id);
  }
  get title(): Graphic['archives'][string]['title'] | undefined {
    return utils.getPkgProp(dotPaths.archives.title(this.id));
  }
  set title(title: Graphic['archives'][string]['title']) {
    utils.setPkgProp(dotPaths.archives.title(this.id), title);
  }
  get description(): Graphic['archives'][string]['description'] | undefined {
    return utils.getPkgProp(dotPaths.archives.description(this.id));
  }
  set description(description: Graphic['archives'][string]['description']) {
    utils.setPkgProp(dotPaths.archives.description(this.id), description);
  }
  get uploaded(): Graphic['archives'][string]['uploaded'] | undefined {
    return utils.getPkgProp(dotPaths.archives.uploaded(this.id));
  }
  set uploaded(uploaded: Graphic['archives'][string]['uploaded']) {
    utils.setPkgProp(dotPaths.archives.uploaded(this.id), uploaded);
  }
  get editions(): Graphic['archives'][string]['editions'] | undefined {
    return utils.getPkgProp(dotPaths.archives.editions(this.id));
  }
  set editions(editions: Graphic['archives'][string]['editions']) {
    utils.setPkgProp(dotPaths.archives.editions(this.id), editions);
  }
}

class Package {
  public dotPaths = dotPaths;
  public pack: Pack;
  public preview: Preview;
  constructor() {
    this.pack = new Pack();
    this.preview = new Preview();
  }
  get homepage(): Pkg['homepage'] | undefined {
    return utils.getPkgProp(dotPaths.homepage);
  }
  set homepage(url: Pkg['homepage']) {
    utils.setPkgProp(dotPaths.homepage, url);
  }
  get separateAssets(): Pkg['reuters']['separateAssets'] | undefined {
    return utils.getPkgProp(dotPaths.separateAssets);
  }
  set separateAssets(url: Pkg['reuters']['separateAssets']) {
    utils.setPkgProp(dotPaths.separateAssets, url);
  }
  archive(id: string) {
    return new Archive(id);
  }
}

export const PKG = new Package();
