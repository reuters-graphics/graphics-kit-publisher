import type { Graphic, RNGS } from '@reuters-graphics/server-client';

export type Edition =
  | 'interactive'
  | 'media-interactive'
  | 'PNG'
  | 'JPG'
  | 'PDF'
  | 'EPS';

export type Archive = {
  url: string;
  slug: string;
  language: RNGS.Language;
  title: string;
  description: string;
  editions: Edition[];
};

export type PackageJsonWithPack = {
  homepage?: string;
  reuters?: {
    preview?: string;
    graphic?: {
      pack?: string;
      desk?: Graphic.Desk;
      language?: RNGS.Language;
      contactEmail?: string;
      slugs?: {
        root: string;
        wild: string;
      };
      authors?: {
        name: string;
        link: string;
      }[];
      published?: string;
      updated?: string;
      archives?: Archive[];
    };
  };
};
