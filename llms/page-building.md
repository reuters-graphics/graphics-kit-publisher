---
name: Page building & routing rules
description: The filesystem, routing and build rules the publisher enforces — directory pages, canonical links, base paths, the single build and per-archive URL rewrite, single-page embeds, preview images, and packLocations config.
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

- **preview**: before the preview build, the publisher works out this git branch's preview URL and saves it to `reuters.preview.branches.<branch-slug>`, so `getBasePath('preview')` resolves during that build. **One preview per branch** — `getBasePath('preview')` resolves the branch itself (from `PUBLISHER_PREVIEW_BRANCH`, then GitHub Actions' `GITHUB_HEAD_REF`/`GITHUB_REF_NAME`, then `git rev-parse`) and looks up that entry. Note there is **no env var handoff for preview**, unlike the placeholder base below: `package.json` is the channel, written before the build spawns. Returns `''` if the branch has no preview yet.
- **prod**: the URL saved to `homepage` in `package.json`, which the graphics server issues on the first upload. **Exception:** during the build the publisher runs itself as part of `upload`, `getBasePath('prod')` returns a placeholder base instead, which the publisher rewrites per archive (see below). Any other build — a human's `npm run build`, CI, a client building the source shipped in `app.zip` — gets the real URL.

## One production build, rewritten per archive

The publisher needs to _see_ built files to know which archives to upload, but production pages need server-issued URLs baked in as base paths. It resolves that by building **once** against a placeholder base URL — `https://www.reuters.com/graphics/__GKP_BASE__/` — and rewriting each archive's copy of the output to that archive's own URL as it packs it:

1. Check credentials, and make sure the graphic pack exists in the graphics server — only a project's first-ever upload creates one (and prompts for pack metadata) here.
2. Build **once**. `getBasePath('prod')` hands out the placeholder base, because the publisher sets `PUBLISHER_PLACEHOLDER_BASE` on the build it spawns.
3. Scan the built files to determine which archives/editions exist.
4. Ask everything it needs to ask — which archives to upload, then their metadata. All prompting happens here, before anything is uploaded.
5. Update the pack, and upload **dummy** files for each selected archive to obtain its URL from the server; save URLs to `package.json`.
6. Stage each archive, rewrite every placeholder reference in it to that archive's URL, and zip.
7. Upload the real archives, replacing the dummies.

The rewrite covers the absolute (`https://www.reuters.com/graphics/__GKP_BASE__/…`) and root-relative (`/graphics/__GKP_BASE__/…`) forms, in HTML, JS, CSS, JSON and sourcemaps. Packing fails loudly if an archive contains no placeholder to rewrite (the build never saw it — usually a version mismatch between the CLI and the copy of the publisher the project builds against) or if any placeholder survives the rewrite.

Two consequences worth knowing:

- **Nothing to configure.** The placeholder is internal to the publisher, and only appears in builds it spawns.
- **`dist/` holds the placeholder build after an `upload`.** Finding `__GKP_BASE__` in the project's own build output is expected; the rewritten copies live in the packed archives, not in `dist/`.

## An embed is a single page

Each embeddable page is packed into its own archive: that page's HTML hoisted to the archive root, plus the archive's own copy of the app's assets (`cdn/`), rewritten to the archive's own URL. So each archive is **self-contained** — it references only its own copy of everything — and re-uploading one archive can't break another. That's what makes it safe to upload a subset of archives (`upload --archives …`) and leave the rest serving.

It also means an embed is exactly one page: **no internal routing, and no links to other pages in the project.** A link to a sibling page may _appear_ to work while testing, because the whole assets directory ships in every archive and client-side routing can render a sibling route without its HTML — but that page's HTML isn't in the archive, so a hard load, a refresh or a shared link 404s. Keep everything an embed needs on the embed's own page.

(The `public` archive is different: it contains the whole build, so the reuters.com pages can route between each other as normal.)

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
- **embeds** — a pattern capturing every embeddable page directory; each must contain a root `index.html` and each is [a single page](#an-embed-is-a-single-page). The pattern **must** include `{locale}` and `{slug}` capture groups, which name the resulting `media-{locale}-{slug}` archives/editions.
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
