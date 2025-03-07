import { defineConfig } from 'astro/config';
import rehypeMermaid from 'rehype-mermaid';
import starlight from '@astrojs/starlight';

export default defineConfig({
  outDir: './dist',
  srcDir: './docs',
  site: 'https://reuters-graphics.github.io',
  base: 'graphics-kit-publisher',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'Graphics Kit publisher',
      logo: {
        light: './docs/assets/logo-light.svg',
        dark: './docs/assets/logo-dark.svg',
        replacesTitle: true,
      },
      editLink: {
        baseUrl:
          'https://github.com/reuters-graphics/graphics-kit-publisher/edit/main/',
      },
      favicon:
        'https://graphics.thomsonreuters.com/style-assets/images/logos/favicon/favicon.ico',
      social: {
        github: 'https://github.com/reuters-graphics/graphics-kit-publisher/',
      },
    }),
  ],
  markdown: {
    rehypePlugins: [[rehypeMermaid, { strategy: 'img-svg', dark: true }]],
  },
});
