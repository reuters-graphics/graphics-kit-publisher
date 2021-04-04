![](badge.svg)

# 📦 @reuters-graphics/graphics-kit-publisher

A filesystem-based publisher for Reuters Graphics projects.

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-kit-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

## Quickstart

```bash
yarn add @reuters-graphics/graphics-kit-publisher
```

### CLI

```bash
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
    -d, --dist       Relative path to a directory of built files we'll use to create your pack  (default dist)
    -p, --pack       Relative path to a directory where your pack will be created  (default graphics-pack)
    -a, --assets     Relative path to a directory of media assets to include with your pack  (default media-assets)
    -s, --statics    Relative path to a static files directory  (default src/statics)
    -i, --images     Relative path to directory of images inside the static files directory  (default images)
    -l, --locales    Relative path to directory of translatable JSON files  (default locales)
    -c, --locale     Default locale  (default en)
    -v, --version    Displays current version
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
    -w, --width                     Set a max width for images beyond which you'll be prompted to resize  (default 2600)
    -z, --size                      Set a max size in KB for images beyond which you'll be prompted to resize  (default 200)
    -f, --fast                      Publish just the public edition
    -d, --dist                      Relative path to a directory of built files we'll use to create your pack  (default dist)
    -p, --pack                      Relative path to a directory where your pack will be created  (default graphics-pack)
    -a, --assets                    Relative path to a directory of media assets to include with your pack  (default media-assets)
    -s, --statics                   Relative path to a static files directory  (default src/statics)
    -i, --images                    Relative path to directory of images inside the static files directory  (default images)
    -l, --locales                   Relative path to directory of translatable JSON files  (default locales)
    -c, --locale                    Default locale  (default en)
    -h, --help                      Displays this message
```

#### publish

```
  Usage
    $ graphics-publisher upload [options]

  Options
    --defaultMetadataFile           Relative path to a JSON file in the default locale with metadata  (default content.json)
    --defaultMetadataTitle          Title prop in default locale metadata  (default seoTitle)
    --defaultMetadataDescription    Description prop in default locale metadata  (default seoDescription)
    -w, --width                     Set a max width for images beyond which you'll be prompted to resize  (default 2600)
    -z, --size                      Set a max size in KB for images beyond which you'll be prompted to resize  (default 200)
                                                                                                                   
jmac@Jons-MacBook-Pro ~/Scripts/bluprint_graphics-kit                                                   [23:34:48] 
> $ npx ./node_modules/@reuters-graphics/graphics-publisher/dist/cli.js publish --help      ⬡ 14.16.0 [±master ✓▴]

  Usage
    $ graphics-publisher publish [options]

  Options
    --defaultMetadataFile           Relative path to a JSON file in the default locale with metadata  (default content.json)
    --defaultMetadataTitle          Title prop in default locale metadata  (default seoTitle)
    --defaultMetadataDescription    Description prop in default locale metadata  (default seoDescription)
    -d, --dist                      Relative path to a directory of built files we'll use to create your pack  (default dist)
    -p, --pack                      Relative path to a directory where your pack will be created  (default graphics-pack)
    -a, --assets                    Relative path to a directory of media assets to include with your pack  (default media-assets)
    -s, --statics                   Relative path to a static files directory  (default src/statics)
    -i, --images                    Relative path to directory of images inside the static files directory  (default images)
    -l, --locales                   Relative path to directory of translatable JSON files  (default locales)
    -c, --locale                    Default locale  (default en)
    -h, --help                      Displays this message
```

### Module

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-kit-publisher';

const graphicsPublisher = new GraphicsPublisher();

graphicsPublisher.upload();
```

## Testing

```bash
yarn test
```
