import { utils } from '@reuters-graphics/graphics-bin';
import { dotPaths } from './dotPaths';
import type { Pkg } from './types';

type Graphic = Pkg['reuters']['graphic'];

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
  constructor() {
    this.pack = new Pack();
  }
  get preview(): Pkg['reuters']['preview'] | undefined {
    return utils.getPkgProp(dotPaths.preview);
  }
  set preview(url: Pkg['reuters']['preview']) {
    utils.setPkgProp(dotPaths.preview, url);
  }
  get homepage(): Pkg['homepage'] | undefined {
    return utils.getPkgProp(dotPaths.homepage);
  }
  set homepage(url: Pkg['homepage']) {
    utils.setPkgProp(dotPaths.homepage, url);
  }
  archive(id: string) {
    return new Archive(id);
  }
}

export const PKG = new Package();
