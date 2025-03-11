import type { Graphic, RNGS } from '@reuters-graphics/server-client';
import type { EditionType } from '../pack/edition/types/base';

type PkgArchive = {
  url: string;
  title: string;
  description: string;
  uploaded: string;
  editions: EditionType[];
};

export type Pkg = {
  homepage: string;
  reuters: {
    preview: string;
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
