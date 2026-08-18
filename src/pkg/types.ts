import type { Graphic, RNGS } from '@reuters-graphics/server-client';
import type { EditionType } from '../pack/edition/types/base';

type PkgArchive = {
  url: string;
  title: string;
  description: string;
  uploaded: string;
  editions: EditionType[];
};

export type PkgPreview = {
  /**
   * S3 key prefix the project's previews live under, e.g.
   * `testfiles/2026/ab12cd34ef56/` — **not** a URL. It has no scheme or host
   * because it isn't a page to open: it's the prefix branch previews are
   * composed from and the prefix `publish` deletes.
   *
   * Minted once and then kept for the life of the project, including across
   * publishes, so every branch resolves under the same prefix.
   */
  root: string;
  /** Branch slug → fully specified, openable preview URL. */
  branches: Record<string, string>;
};

export type Pkg = {
  homepage: string;
  reuters: {
    preview: PkgPreview;
    separateAssets: string;
    graphic: {
      slugs: {
        root: string;
        wild: string;
      };
      language: RNGS.Language;
      desk: Graphic.Desk;
      pack: string;
      contactEmail: string;
      authors: {
        name: string;
        link: string;
      }[];
      title: string;
      description: string;
      published: string;
      updated: string;
      archives: Record<string, PkgArchive>;
    };
  };
};
