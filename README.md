![](badge.svg)

# @reuters-graphics/graphics-publisher

A filesystem-based publisher for Reuters Graphics projects.

[![npm version](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-publisher.svg)](https://badge.fury.io/js/%40reuters-graphics%2Fgraphics-publisher) [![Reuters open source software](https://badgen.net/badge/Reuters/open%20source/?color=ff8000)](https://github.com/reuters-graphics/)

## Quickstart

```bash
yarn add @reuters-graphics/graphics-publisher
```

### CLI

```bash
graphics-publisher upload
```

### Module

```javascript
import GraphicsPublisher from '@reuters-graphics/graphics-publisher';

const graphicsPublisher = new GraphicsPublisher();

graphicsPublisher.upload();
```

## Testing

```bash
yarn test
```
