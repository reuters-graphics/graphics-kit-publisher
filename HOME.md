# 📦 graphics-kit-publisher

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

A filesystem-based publisher for Reuters Graphics projects.

## Why this?

Reuters Graphics projects are packaged for both reuters.com readers and media clients. The structure each graphics pack needs to conform to is defined by our RNGS server, and it is [complex](https://github.com/reuters-graphics/bluprint_graphics-kit/issues/1). This package exists to help compile graphics packs for our server in a way that works across different page builders.

Each graphics pack may consist of any number of public pages for dotcom readers and embeddable graphics for media clients. The publisher needs to be able to flex with each project and bundle all the outputs the right way.

We do that by presuming a certain _filesystem structure_ that the graphics-publisher knows how to pack up for the RNGS server. That makes it a good match for page builders that use filesystem-based routing, namely [SvelteKit](https://kit.svelte.dev/) and [Next.js](https://nextjs.org/), and gives us a publishing tool that makes very few assumptions about the way projects are built as long as they output a pattern of files.

## Quickstart

```bash
npm i -D @reuters-graphics/graphics-kit-publisher
```

### CLI

#### upload

```bash
  Usage
    $ graphics-publisher upload [options]

  Options
    --warnImageSize          Set a max size in KB for images beyond which you'll be prompted to resize  (default 200)
    --fast                   Upload just the public edition, ignoring media embeds
    --distDir                Relative path to a directory of built files we'll use to create your pack  (default dist)
    --packDir                Relative path to a directory where your pack will be created  (default graphics-pack)
    --assetsDir              Relative path to a directory of media assets to include with your pack  (default media-assets)
    --imagesDir              Relative path to directory of images which includes the public share image  (default src/statics/images)
    --localesDir             Relative path to directory of translatable JSON files  (default locales)
    --packLocale             Default locale for pack  (default en)
    --packMetadataFile       Relative path to a JSON file in the default locale with pack metadata  (default content.json)
    --packTitleProp          Title prop in default pack metadata file  (default SEOTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default SEODescription)
    -h, --help               Displays this message                    Displays this message
```

#### publish

```bash
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
    --packTitleProp          Title prop in default pack metadata file  (default SEOTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default SEODescription)
    -h, --help               Displays this message
```

#### preview

```bash
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
    --packTitleProp          Title prop in default pack metadata file  (default SEOTitle)
    --packDescriptionProp    Description prop in default pack metadata file  (default SEODescription)
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
  packTitleProp: 'SEOTitle',
  packDescriptionProp: 'SEODescription',
};
```

#### upload

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher(defaultConfig);

const defaultUploadOptions = {
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

The publisher assumes certain things about the structure of your development environment.

### dist directory (`distDir`)

A dist directory is the output from your page builder.

- The dist directory has an `index.html` file at its root, which includes an `og:image` metatag (used to create a preview image for the graphics pack).
- All static assets are included in a separate root-level directory inside the dist folder, e.g., `cdn/` below, and are absolutely referenced from any HTML page in the project.
- All embeddable graphic pages are contained in a root-level directory named `embeds/` and placed in folders representing a valid locale code and a unique slug within that locale, e.g., `en/chart/index.html` below.
- Additional pages can be named whatever they need to be as long as they don't collide with `embeds` or the static assets directory.

```bash
📂 dist/
  📂 cdn/
    📂 js/
      - ...
    📂 css/
      - ...
    📂 images/
      - ...
  - index.html
  📂 a-second-page/
    - index.html
  📂 embeds/
    📂 en/
      📂 chart/
        - index.html
```

### pack directory (`packDir`)

A directory will be created containing the different `zip` archives used to build out your graphics pack.

```bash
📂 graphics-pack/
  - public.zip
  - media-en-chart.zip
  - media-en-map.zip
```

See [this issue](https://github.com/reuters-graphics/bluprint_graphics-kit/issues/1#issuecomment-812350299) for more information on the structure of the files sent to the RNGS server.

### media assets directory (`assetsDir`)

The media assets directory contains flat JPG and EPS files that will be included with the media editions uploaded to the server. They must be structured using the same directory scheme as embeds in the dist directory -- a folder for a valid locale and for a unique slug within the locale. The JPG and EPS filenames can be whatever you want them to be.

```bash
📂 media-assets/
  📂 en/
    📂 chart/
      - chart.eps
      - chart.jpg
    📂 map/
      - my-map.eps
      - map-preview.jpg
```

If you have an embeddable page using the same locale/slug scheme as a set of flat assets, the publisher will upload the JPG and EPS file _with_ the embeddable version of the same graphic.

```bash
📂 dist/
  📂 embeds/
    📂 en/
      📂 chart/
        - index.html
📂 media-assets/
  📂 en/
    📂 chart/
      - chart.eps
      - chart.jpg
📂 graphics-pack/
  - media-en-chart.zip # 👈 Contains both embeddable graphic and flats
```

### locales directory (`localesDir`)

The locales directory contains structured data used to translate the content of your page. The publisher assumes this directory has sub-directories named using a valid locale code, including at least the default locale code for the pack (`packLocale`, usually `'en'`).

Otherwise, the publisher assumes one JSON file (`packMetadataFile`) within this default locale sub-directory contains a title (`packTitleProp`) and description (`packDescriptionProp`) for the pack.

```bash
📂 locales/
  📂 en/
    - content.json
```

### images directory (`imagesDir`)

An images directory contains at least the share image referenced in the metatag in the root `index.html` file in the dist directory.

```bash
📂 src/
  📂 statics/
    📂 images/
      - share-card.jpg
```

The publisher will create a `manifest.json` file in the root of the images directory with dimensions for every image in that directory. You can use it to set the dimensions of images in your project.

### Referrals

Sometimes we want to publish embeds that are only used on Reuters' website, i.e., never made available to clients in Reuters Connect. The most common use case for these is to make simple referrals that can be embedded in another Reuters dotcom page and direct readers to our graphics page.

Within the embeddables directory, you can nest any valid embed page under a `referral/` directory and that page will automatically be made **only** available in Lynx, and **excluded** from Connect.

```bash
📂 dist/
  📂 embeds/
    📂 en/
      📂 referral/
        - index.html
```

### package.json

The publisher will fill out your [homepage](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#homepage) prop in package.json with the URL where the root `index.html` file in the dist directory will be served from when it's published through the RNGS server.

It will also fill out a `reuters` prop with metadata about the RNGS graphics pack.

#### build scripts

The publisher assumes two npm [scripts](https://docs.npmjs.com/cli/v7/using-npm/scripts) will be defined in your package.json.

The `build` script will run your page builder, which should build the pages and assets in the dist directory. It will be run during the publisher's `upload` command.

The `build:preview` will be run during the publisher's `preview` command.

Before the publisher runs either `build` or `build:preview`, it will fill out the `homepage` or `reuters.preview` property in package.json, respectively, with the eventual URL the root `index.html` page will be published to. Your page builder can then access that info for use in filling out metatags and absolutely referencing static assets.

## Reuters Graphics user profiles

The publisher assumes you have two user profiles in your computer's home directory.

The `~/.reuters-graphics/graphics-server.json` file contains credentials to grant access to the RNGS server API.

The `~/.reuters-graphics/profile.json` file contains your personal profile.

## Running in a serverless environment

Set the following environment variables in lieu of the above user profiles and make sure your project's metadata has already been filled out.

- `GRAPHICS_SERVER_USERNAME`
- `GRAPHICS_SERVER_PASSWORD`
- `GRAPHICS_SERVER_API_KEY`

And if publishing, be sure to set:

- `GRAPHICS_SERVER_PUBLISH`
- `GRAPHICS_SERVER_PUBLISH_TO_MEDIA` _(optional)_
- `GRAPHICS_SERVER_PUBLISH_TO_LYNX` _(optional)_

You can also set `GRAPHICS_SERVER_NOTIFY_TEAMS_CHANNEL` with a Teams channel webhook to notify that channel when the project is successfully published.
