export const dotPaths = {
  preview: 'reuters.preview',
  homepage: 'homepage',
  pack: {
    id: 'reuters.graphic.pack',
    slugs: {
      root: 'reuters.graphic.slugs.root',
      wild: 'reuters.graphic.slugs.wild',
    },
    language: 'reuters.graphic.language',
    desk: 'reuters.graphic.desk',
    contactEmail: 'reuters.graphic.contactEmail',
    title: 'reuters.graphic.title',
    description: 'reuters.graphic.description',
    published: 'reuters.graphic.published',
    updated: 'reuters.graphic.updated',
    authors: 'reuters.graphic.authors',
    archives: 'reuters.graphic.archives',
  },
  archives: {
    url: (id: string) => `reuters.graphic.archives.${id}.url` as const,
    title: (id: string) => `reuters.graphic.archives.${id}.title` as const,
    description: (id: string) =>
      `reuters.graphic.archives.${id}.description` as const,
    uploaded: (id: string) =>
      `reuters.graphic.archives.${id}.uploaded` as const,
  },
} as const;
