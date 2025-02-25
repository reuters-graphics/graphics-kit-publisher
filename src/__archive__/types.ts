/* eslint-disable @typescript-eslint/no-explicit-any */
export interface PackageMetadata {
  contact: {
    name: string;
    email: string;
  };
  graphic: {
    pack: string;
    desk: string;
    slugs: {
      root: string;
      wild: string;
    };
    authors: { name: string; link: string }[];
    referrals: any[];
    published: null | string;
    updated: null | string;
    mediaEditions: {
      slug: string;
      url: string;
      title: string;
      description: string;
    }[];
  };
  preview: string;
}
