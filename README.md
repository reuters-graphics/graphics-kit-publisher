![](badge.svg)

# 📦 @reuters-graphics/graphics-kit-publisher

A filesystem-based publisher for Reuters Graphics projects.

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

## Quickstart

```bash
yarn add @reuters-graphics/graphics-kit-publisher
```

### CLI

```
 Usage
    $ graphics-publisher <command> [options]

  Available Commands
    prepack    
    pack       
    measure    
    upload     
    publish    

  For more info, run any command with the `--help` flag
    $ graphics-publisher prepack --help
    $ graphics-publisher pack --help

  Options
    --dist       Relative path to a directory of built files we'll use to create your pack  (default dist)
    --pack       Relative path to a directory where your pack will be created  (default graphics-pack)
    --assets     Relative path to a directory of media assets to include with your pack  (default media-assets)
    --statics    Relative path to a static files directory  (default src/statics)
    --images     Relative path to directory of images inside the static files directory  (default images)
    --locales    Relative path to directory of translatable JSON files  (default locales)
    --locale     Default locale  (default en)
    --version    Displays current version
    -h, --help       Displays this message
```

#### `upload`

```
  Usage
    $ graphics-publisher upload [options]

  Options
    --defaultMetadataFile           Relative path to a JSON file in the default locale with metadata  (default content.json)
    --defaultMetadataTitle          Title prop in default locale metadata  (default seoTitle)
    --defaultMetadataDescription    Description prop in default locale metadata  (default seoDescription)
    --width                         Set a max width for images beyond which you'll be prompted to resize  (default 2600)
    --size                          Set a max size in KB for images beyond which you'll be prompted to resize  (default 200)
    --fast                          Publish just the public edition
    --dist                          Relative path to a directory of built files we'll use to create your pack  (default dist)
    --pack                          Relative path to a directory where your pack will be created  (default graphics-pack)
    --assets                        Relative path to a directory of media assets to include with your pack  (default media-assets)
    --statics                       Relative path to a static files directory  (default src/statics)
    --images                        Relative path to directory of images inside the static files directory  (default images)
    --locales                       Relative path to directory of translatable JSON files  (default locales)
    --locale                        Default locale  (default en)
    -h, --help                      Displays this message
```

#### publish

```
  Usage
    $ graphics-publisher publish [options]

  Options
    --defaultMetadataFile           Relative path to a JSON file in the default locale with metadata  (default content.json)
    --defaultMetadataTitle          Title prop in default locale metadata  (default seoTitle)
    --defaultMetadataDescription    Description prop in default locale metadata  (default seoDescription)
    --dist                          Relative path to a directory of built files we'll use to create your pack  (default dist)
    --pack                          Relative path to a directory where your pack will be created  (default graphics-pack)
    --assets                        Relative path to a directory of media assets to include with your pack  (default media-assets)
    --statics                       Relative path to a static files directory  (default src/statics)
    --images                        Relative path to directory of images inside the static files directory  (default images)
    --locales                       Relative path to directory of translatable JSON files  (default locales)
    --locale                        Default locale  (default en)
    -h, --help                      Displays this message
```

### Module

#### upload

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher();

graphicsPublisher.upload();
```

#### publish

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher();

graphicsPublisher.publish();
```

## Testing

```bash
yarn test
```
