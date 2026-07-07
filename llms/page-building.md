---
name: Page building & routing rules
description: The filesystem, routing and build rules the publisher enforces — directory pages, canonical links, base paths, the two-pass build, preview images, and packLocations config.
---

# Page building & routing rules

The publisher matches a project's **built files** to [editions](./graphics-server.md#editions) using filesystem patterns. To be matched, output must obey these rules.

## Directory-based pages

Every page must live in its own folder as `index.html`. Flat `.html` files are **not** allowed.

```
dist/about.html          ❌ not allowed
dist/about/index.html    ✅ ok
```

## Canonical link (required)

Every page **must** include a canonical `<link>` with the fully-specified URL where it will publish on reuters.com. The publisher relies on it.

```html
<head>
  <link rel="canonical" href="https://www.reuters.com/graphics/.../" />
  <link rel="stylesheet" href="https://www.reuters.com/.../styles.css" />
</head>
```

## Base paths

Pages usually need a build-time base path (for canonical links and fully-qualified asset URLs). Use the `getBasePath` utility rather than hardcoding:

```javascript
// svelte.config.js
import { getBasePath } from '@reuters-graphics/graphics-kit-publisher';

const mode =
  process.env.PREVIEW ? 'preview'
  : process.env.NODE_ENV === 'production' ? 'prod'
  : 'dev';

const basePath = getBasePath(mode, {
  trailingSlash: false,
  rootRelative: true,
});
// e.g. "/graphics/ROOT-SLUG/WILD/asdjuspodfg"

const assetsPath = getBasePath(mode, 'cdn', {
  trailingSlash: false,
  rootRelative: false,
});
// e.g. "https://www.reuters.com/graphics/ROOT-SLUG/WILD/asdjuspodfg/cdn"
```

`mode` is one of `dev`, `test`, `preview`, `prod`. It reads URLs the publisher has saved to `package.json`:

- **preview**: before the preview build, the publisher generates a unique URL and saves it to `reuters.graphic.preview`, so `getBasePath('preview')` resolves during that build.
- **prod**: production base URLs come from the graphics server after upload (see the two-pass build below).

## Two-pass production build

The publisher needs to _see_ built files to know which archives to upload, but production pages need server-issued URLs baked in as base paths — a chicken-and-egg problem it solves by building twice:

1. Create the graphic pack in the graphics server.
2. Build **without** base-path URLs.
3. Scan the built files to determine which archives/editions exist.
4. Upload **dummy** files for each archive to obtain its URL from the server; save URLs to `package.json`.
5. Build the **production** version, which can now use the saved URLs for base paths and canonical links.
6. Replace the dummy archives with the real built files.

## Build logs & diagnosing failures

The publisher runs the project's own build scripts as a child process — `build:preview` for `preview`, `build` for `upload`/`publish` (see [`build.scripts`](./config.md#build)). If a build **fails**, the command aborts: `preview` and `upload` cannot complete, and the publisher raises a build error.

Every build writes its captured output to `.graphics-kit/logs/`, whether it succeeds or fails:

- `.graphics-kit/logs/error.log` — the build's `stderr`. **Start here to diagnose a failed build.**
- `.graphics-kit/logs/out.log` — the build's `stdout`.

Each file is overwritten on every build and prefixed with a timestamp. So when a `preview` or `upload` fails at the build step, read `error.log` to find the underlying error in the project's code — that's almost always the real problem, not the publisher itself. (`.graphics-kit/` is a working directory the publisher manages; it's excluded from packed archives.)

## Preview images

[Interactive](./graphics-server.md#edition-types) editions need an image for previews (graphics server, Lynx, Reuters Connect). Provide one of:

- an `og:image` meta tag in the page (if the image is among the build's assets):
  ```html
  <meta
    property="og:image"
    content="https://www.reuters.com/graphics/.../share.jpg"
  />
  ```
- or an image file at the edition root named `_gfxpreview.png` or `_gfxpreview.jpg`.

Valid preview types: `.jpg`, `.jpeg`, `.png`.

## packLocations (mapping built files → editions)

`packLocations` in `publisher.config.ts` tells the publisher where each kind of output lives. Each can be set to `false` if the project has none of that type.

```typescript
export default defineConfig({
  packLocations: {
    dotcom: 'dist/', // default
    embeds: 'dist/embeds/{locale}/{slug}/', // default
    statics: 'media-assets/{locale}/{slug}/', // default
  },
});
```

- **dotcom** — directory holding the reuters.com page(s); must contain a root `index.html`. Becomes the `public` archive.
- **embeds** — a pattern capturing every embeddable page directory; each must contain a root `index.html`. The pattern **must** include `{locale}` and `{slug}` capture groups, which name the resulting `media-{locale}-{slug}` archives/editions.
- **statics** — a pattern capturing directories of static/editable graphics; each must contain at least one static file (`.eps`, `.jpg`, `.png`, `.pdf`) at its root. Also requires `{locale}` and `{slug}` capture groups.

Example — `embeds: 'dist/embeds/{locale}/{slug}/'` captures:

```
dist/embeds/
├── en/          {locale}
│   ├── page/    {slug}   → index.html
│   └── map/     {slug}   → index.html
└── de/          {locale}
    └── map/     {slug}   → index.html
```

## Related config

- `build.scripts` — npm script keys for `preview` and `production` builds (defaults: `build:preview`, `build`).
- `build.outDir` — where the build system writes output (default `dist/`).
- `publishingLocations` — rules matching archive IDs (string or RegExp) to whether they may publish to `lynx` / `connect`.
- `archiveEditions` — files added to `media-interactive` editions (`docs`, incl. a required `README.txt`), ignore patterns for the client source zip, and `separateAssets` (a directory uploaded separately to S3).
- `embedTemplate` — the embed code (`declaration`) and shared `dependencies` for embeddable graphics.
