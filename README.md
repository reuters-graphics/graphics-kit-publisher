![](badge.svg)

# 📦 graphics-kit-publisher

A filesystem-based publisher for Reuters Graphics projects.

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

## Quickstart

```bash
yarn add @reuters-graphics/graphics-kit-publisher
```

### CLI

#### `upload`

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

#### upload

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const publisherOptions = {
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

const graphicsPublisher = new GraphicsPublisher(publisherOptions);

const uploadOptions = {
  warnImageWidth: 2600,
  warnImageSize: 200,
  fast: false,
};

await graphicsPublisher.upload(uploadOptions);
```

#### publish

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const publisherOptions = {
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

const graphicsPublisher = new GraphicsPublisher(publisherOptions);

await graphicsPublisher.publish();
```

#### preview

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const publisherOptions = {
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

const graphicsPublisher = new GraphicsPublisher(publisherOptions);

await graphicsPublisher.preview();
```
