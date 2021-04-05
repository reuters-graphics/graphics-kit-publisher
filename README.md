![](badge.svg)

# 📦 graphics-kit-publisher

A filesystem-based publisher for Reuters Graphics projects.

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

## Why this?

Reuters Graphics projects are packaged for both reuters.com readers and media clients. The structure each graphics pack needs to conform to is defined by our RNGS server, and it is [complex](https://github.com/reuters-graphics/bluprint_graphics-kit/issues/1). This package exists to help compile graphics packs for our server in a way that works across different page builders.

Each graphics pack may consist of any number of public pages for dotcom readers and embeddable graphics for media clients. The publisher needs to be able to flex with each project and bundle all the outputs the right way.

We do that by presuming a certain _filesystem structure_ that the graphics-publisher knows how to pack up for the RNGS server. That makes it a good match for page builders that use filesystem-based routing, namely [SvelteKit](https://kit.svelte.dev/) and [Next.js](https://nextjs.org/), and gives us a publishing tool that makes very few assumptions about the way projects are built as long as they output a pattern of files.

## Quickstart

```bash
yarn add @reuters-graphics/graphics-kit-publisher
```

### CLI

#### upload

```
  Usage
    $ graphics-publisher upload [options]

  Options
    --warnImageWidth         Set a max width for images beyond which you'll be prompted to resize  (default 2600)
    --warnImageSize          Set a max size in KB for images beyond which you'll be prompted to resize  (default 200)
    --fast                   Upload just the public edition, ignoring media embeds
    --distDir                Relative path to a directory of built files we'll use to create your pack  (default dist)
    --packDir                Relative path to a directory where your pack will be created  (default graphics-pack)
    --assetsDir              Relative path to a directory of media assets to include with your pack  (default media-assets)
    --imagesDir              Relative path to directory of images which includes the public share image  (default src/statics/images)
    --localesDir             Relative path to directory of translatable JSON files  (default locales)
    --packLocale             Default locale for pack  (default en)
    --packMetadataFile       Relative path to a JSON file in the default locale with pack metadata  (default content.json)
    --packTitleProp          Title prop in default pack metadata file  (default seoTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default seoDescription)
    -h, --help               Displays this message                    Displays this message
```

#### publish

```
  Usage
    $ graphics-publisher publish [options]

  Options
    --distDir                Relative path to a directory of built files we'll use to create your pack  (default dist)
    --packDir                Relative path to a directory where your pack will be created  (default graphics-pack)
    --assetsDir              Relative path to a directory of media assets to include with your pack  (default media-assets)
    --imagesDir              Relative path to directory of images which includes the public share image  (default src/statics/images)
    --localesDir             Relative path to directory of translatable JSON files  (default locales)
    --packLocale             Default locale for pack  (default en)
    --packMetadataFile       Relative path to a JSON file in the default locale with pack metadata  (default content.json)
    --packTitleProp          Title prop in default pack metadata file  (default seoTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default seoDescription)
    -h, --help               Displays this message
```

#### preview

```
  Usage
    $ graphics-publisher preview [options]

  Options
    --distDir                Relative path to a directory of built files we'll use to create your pack  (default dist)
    --packDir                Relative path to a directory where your pack will be created  (default graphics-pack)
    --assetsDir              Relative path to a directory of media assets to include with your pack  (default media-assets)
    --imagesDir              Relative path to directory of images which includes the public share image  (default src/statics/images)
    --localesDir             Relative path to directory of translatable JSON files  (default locales)
    --packLocale             Default locale for pack  (default en)
    --packMetadataFile       Relative path to a JSON file in the default locale with pack metadata  (default content.json)
    --packTitleProp          Title prop in default pack metadata file  (default seoTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default seoDescription)
    -h, --help               Displays this message
```

### Module

#### config

```javascript
const defaultConfig = {
  distDir: 'dist',
  packDir: 'graphics-pack',
  assetsDir: 'media-assets',
  imagesDir: 'src/statics/images',
  localesDir: 'locales',
  packLocale: 'en',
  packMetadataFile: 'content.json',
  packTitleProp: 'seoTitle',
  packDescriptionProp: 'seoDescription',
};
```

#### upload

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher(defaultConfig);

const defaultUploadOptions = {
  warnImageWidth: 2600,
  warnImageSize: 200,
  fast: false,
};

await graphicsPublisher.upload(defaultUploadOptions);
```

#### publish

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher(defaultConfig);

await graphicsPublisher.publish();
```

#### preview

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher(defaultConfig);

await graphicsPublisher.preview();
```

## Filesystem structure

graphics-publisher assumes certain things about the structure of your development environment:

#### dist directory

A dist directory is the output from your page builder.

- The dist directory has an `index.html` file at its root, which includes an `og:image` metatag (used to create a preview image for pack).
- All static assets are included in a separate root-level directory inside the dist folder, e.g., `cdn/` below, and are absolutely referenced from any HTML page in the project.
- All embeddable graphic pages are contained in a root-level directory named `embeds/` and placed in folders representing a valid locale code and a unique slug within that locale, e.g., `en/chart/index.html` below.
- Additional pages can be named whatever they need to be as long as they don't collide with `embeds` or the static assets directory.

```
dist/
  cdn/
    js/ ...
    css/ ...
    images/ ...
  index.html
  a-second-page/
    index.html
  embeds/
    en/
      chart/
        index.html
```

#### pack directory

#### media assets directory

#### locales directory

#### images directory

#### pack metadata

#### build scripts

#### Reuters Graphics user profile
