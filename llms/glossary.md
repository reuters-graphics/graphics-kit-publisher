---
name: Glossary
description: Key terms for the graphics kit publisher and the Sphinx graphics server — pack, archive, edition, slug, desk, RNGS, Lynx, Connect, and related concepts.
---

# Glossary

## Graphics server structure

**Sphinx graphics server** — Reuters' server that stores and publishes graphics. The publisher uploads to it. Defines the pack/archive/edition structure everything conforms to.

**Graphic pack** — The top-level unit: an entire graphics project, containing one or more archives. Identified in the server by a UUID (`reuters.graphic.pack` in `package.json`).

**Archive** — A ZIP uploaded to the server, representing one graphic or a set of HTML pages. Contains one or more editions; must contain at least one. Named `public.zip` or `media-{locale}-{slug}.zip`. Referenced locally by its **archive ID** (e.g. `public`, `media-en-map`).

**Edition** — A single _format_ of a graphic inside an archive (a folder locally). Its **root file** sets its format and available publishing options. See edition types below.

**Root file** — The file at an edition folder's top level that defines its format. `.html` takes precedence; also `.txt`, `.jpg`, `.png`, `.pdf`. With multiple same-type files, the first zipped wins (order not controllable) — so keep one clear root file.

## Edition types

**Interactive edition** — HTML page(s) for reuters.com. Root file `index.html`. Needs a preview image. Publishes to Public RNGS; may be searchable in Lynx.

**Media-interactive edition** — An embeddable graphic (a zipped copy of the project, `app.zip`) for Reuters Connect / Lynx / Arc. Root file `README.txt`. Needs a preview image.

**Static file edition** — A single static image (`JPG`/`PNG`) or editable source (`EPS`/`PDF`). Root file matches the edition type (e.g. the `PNG` edition → `map.png`). JPG/PNG publish to Public RNGS; EPS/PDF to Reuters Connect.

## Identifiers

**Slug** — An ID for a graphic within an archive (`map`, `bar-chart`, `page`).

**Root slug** — The project-level slug identifying the whole pack (`reuters.graphic.slugs.root`); appears in URLs. Follows a strict uppercase, hyphenated server pattern (e.g. `HEALTH-CORONAVIRUS`) — ask the user for it rather than generating one. See [pack-metadata.md](./pack-metadata.md#slugs-ask-the-user-dont-generate-them).

**Wild slug** — A secondary, "wild" slug segment for the pack (`reuters.graphic.slugs.wild`); appears in URLs alongside the root slug. Follows a strict server pattern (e.g. `MAP`) and may be empty — ask the user for it. See [pack-metadata.md](./pack-metadata.md#slugs-ask-the-user-dont-generate-them).

**Locale / language** — A valid RNGS language code identifying an archive/edition's or pack's language. One of `en`, `ar`, `fr`, `es`, `de`, `it`, `ja`, `pt`, `ru` (usually `en`).

**Desk** — The Reuters graphics desk owning the pack, typically sourced from the user's local profile. One of `london`, `new york`, `singapore`, `bengaluru`.

## Publishing destinations

**RNGS** — Reuters News Graphics Service. **Public RNGS** is the public destination on reuters.com for interactive and JPG/PNG editions.

**Reuters Connect** — The platform where media clients purchase/embed graphics. Destination for media-interactive and EPS/PDF editions. Also called "Media" as a publishing location.

**Lynx** — Reuters' story editor. An edition "searchable in Lynx" can be embedded into other reuters.com stories (via Lynx/Arc embed tools). Only interactive editions should be searchable; the publisher sets this automatically when publishing from the terminal.

**Arc** — A publishing/editor system that can embed Lynx-searchable graphics into stories.

## Publisher concepts

**publisher.config.ts** — The project's config file, created with `defineConfig`.

**packLocations** — Config mapping built files to editions: `dotcom` (the `public` archive), `embeds` (`media-*` interactive editions), `statics` (static/editable editions). Embed/static patterns use `{locale}` and `{slug}` capture groups.

**Metadata pointer** — A config entry telling the publisher where to read a metadata value from a project file, written as `"<file path>?<data path>"` (e.g. `locales/en/content.json?story.title`), optionally with `format`, `validate`, and `promptAsInitial`.

**Pack metadata** — Data saved to `package.json` under the `reuters` key (pack ID, slugs, desk, authors, timestamps, archives/editions and their URLs). Read it with the **`PKG`** getters.

**PKG** — The exported module of typed getters for pack metadata (`PKG.homepage`, `PKG.pack.rootSlug`, `PKG.archive(id).url`, …).

**getBasePath** — Exported utility returning the base/asset path for a build `mode` (`dev`/`test`/`preview`/`prod`) from URLs saved in `package.json`. Returns the **placeholder base URL** (below) instead during the build the publisher spawns itself on upload.

**Separate assets** — A directory (e.g. precursor Illustrator/Photoshop files) uploaded as a single ZIP to S3 rather than the graphics server, with its link saved to `reuters.separateAssets`. Configured via `archiveEditions.separateAssets`.

**Preview image** — An image representing an edition in the graphics server, Lynx and Connect: an `og:image` tag or a `_gfxpreview.png`/`.jpg` at the edition root.

**Placeholder base URL** — `https://www.reuters.com/graphics/__GKP_BASE__/`, the base a project is built against on upload so each archive's copy of the output can be rewritten to that archive's own URL. Internal to the publisher: it's delivered by `getBasePath` only when the publisher sets the `PUBLISHER_PLACEHOLDER_BASE` env var on the build it spawns, so builds run by anyone else still get real URLs. Nothing to configure. See [page-building.md](./page-building.md#one-production-build-rewritten-per-archive).

**Self-contained archive** — Every archive carries its own copy of the page(s) and assets it serves, pointing at its own URL. Re-uploading one archive therefore can't break another, which is what makes it safe to upload only some of them.

**Archive selection** — Which archives an `upload` sends: `graphics-publisher upload --archives public,media-en-map` (archive IDs, exactly as the prompt and logs show them), or an interactive prompt when the flag is omitted. CI with no flag uploads everything. Unselected archives are left untouched on the server; any previously uploaded keep serving.

**Preview** — A build uploaded to the testfiles S3 bucket for review, before creating a real graphics-server pack (`graphics-publisher preview`).

**`.graphics-kit/`** — A working directory the publisher manages in the project root (build logs, packing, temp files); excluded from packed archives. Its `logs/` holds `error.log` (build `stderr`) and `out.log` (build `stdout`), overwritten and timestamped each build — read `error.log` to diagnose a failed `preview`/`upload` build.
