---
name: Configuration
description: Reference for publisher.config.ts options — build, packLocations, metadataPointers, archiveEditions, embedTemplate, and publishingLocations.
---

# Configuration

The publisher is configured with `publisher.config.ts` in the project root. All options are optional and have sensible defaults.

```typescript
// publisher.config.ts
import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

export default defineConfig({
  // options below
});
```

Options are grouped into six keys: `build`, `packLocations`, `metadataPointers`, `archiveEditions`, `embedTemplate`, `publishingLocations`. `packLocations` and `metadataPointers` are covered in depth in [page-building.md](./page-building.md) and [pack-metadata.md](./pack-metadata.md) respectively and summarized here.

## build

Controls how the publisher builds and reads the project.

```typescript
build: {
  scripts: { preview: 'build:preview', production: 'build' }, // npm script keys
  outDir: 'dist/',                                            // where the build writes output
}
```

- **build.scripts** — the `package.json` npm script keys the publisher runs for the `preview` and `production` builds. Defaults `{ preview: 'build:preview', production: 'build' }`.
- **build.outDir** — the directory the build system writes to. Default `'dist/'`.

## packLocations

Maps built files to [editions](./graphics-server.md#editions). Each may be `false` if the project has none of that type. See [page-building.md](./page-building.md#packlocations-mapping-built-files--editions) for capture-group details.

```typescript
packLocations: {
  dotcom: 'dist/',                          // string | false — the `public` archive; needs root index.html
  embeds: 'dist/embeds/{locale}/{slug}/',   // string | false — media-* interactive editions; needs root index.html
  statics: 'media-assets/{locale}/{slug}/', // string | false — static/editable editions; needs a root static file
}
```

- **dotcom** (default `'dist/'`) — directory of reuters.com page(s). Must contain a root `index.html`.
- **embeds** (default `'dist/embeds/{locale}/{slug}/'`) — pattern capturing every embeddable page directory. Must include `{locale}` and `{slug}` capture groups; each directory needs a root `index.html`.
- **statics** (default `'media-assets/{locale}/{slug}/'`) — pattern capturing directories of static graphics. Must include `{locale}` and `{slug}`; each needs at least one root static file (`.eps`, `.jpg`, `.png`, `.pdf`).

## metadataPointers

Tells the publisher where to source metadata values from project files (JSON or built HTML). Full syntax, defaults and the pointer object (`path`, `format`, `validate`, `promptAsInitial`) are in [pack-metadata.md](./pack-metadata.md#sourcing-metadata-pointers).

```typescript
metadataPointers: {
  pack: {
    rootSlug: 'locales/en/content.json?story.rootSlug',
    wildSlug: 'locales/en/content.json?story.wildSlug',
    desk: { path: '~/.reuters-graphics/profile.json?desk', promptAsInitial: true },
    language: 'en',                    // bare string = literal RNGS language code, not a pointer
    title: 'dist/index.html?title',
    byline: 'locales/en/content.json?story.authors',
    contactEmail: '~/.reuters-graphics/profile.json?email',
  },
  edition: {
    title: 'index.html?title',                    // path is relative to the edition root
    description: 'index.html?meta.og:description',
  },
}
```

## archiveEditions

Controls the source archives shared with clients on Reuters Connect.

```typescript
archiveEditions: {
  docs: {                              // files created in the root of media-interactive editions
    'README.txt': 'src/docs/readme.txt',        // REQUIRED — the media-interactive root file
    'EMBED.html': 'src/docs/embed.html',
  },
  ignore: ['project-files/'],          // extra gitignore-style patterns to exclude from the client source zip
  separateAssets: 'project-files/',    // string | false — dir uploaded to S3 separately (default 'project-files/')
}
```

- **docs** — `Record<string, string | function>`. Each key is a filename created at the root of every `media-interactive` edition. You **must** define a `README.txt` key (it becomes the edition's [root file](./graphics-server.md#editions)).
  - **string value** — a path to a local file, copied in and rendered as a [mustache](https://github.com/janl/mustache.js) template with context `{ embedUrl, embedSlug, year }`.
  - **function value** — `(args: { embedUrl, embedSlug }) => string` returning the file contents.
- **ignore** — `string[]` of [gitignore-pattern](https://git-scm.com/docs/gitignore#_pattern_format) globs to exclude from the client source ZIP, in addition to the project's `.gitignore`. Default `[]`.
- **separateAssets** — a directory whose contents are zipped and uploaded to S3 separately (useful for large precursor files like Illustrator/Photoshop that clients may need). The link is saved to `reuters.separateAssets`. Default `'project-files/'`; set `false` to disable.

## embedTemplate

The embed code emitted for published embeddable graphics.

```typescript
embedTemplate: {
  declaration: ({ embedUrl, embedSlug }) =>
    `<div id="${embedSlug}"></div><script type="text/javascript">new pym.Parent("${embedSlug}", "${embedUrl}", {});</script>`,
  dependencies: ({ embedUrl, embedSlug }) =>
    `<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>`,
}
```

- **declaration** — `({ embedUrl, embedSlug }) => string`. The embed markup for a single graphic.
- **dependencies** — `({ embedUrl, embedSlug }) => string`. Scripts included once per page (usually in `<head>`).

## publishingLocations

Rules for where archives are allowed to publish. An array; each entry matches archive IDs and sets allowed locations. Default `[]`.

```typescript
publishingLocations: [
  { archive: 'public', availableLocations: { lynx: false, connect: false } },
  { archive: /-referral$/, availableLocations: { lynx: true, connect: false } },
]
```

- **archive** — a `string` or `RegExp` matching an [archive ID](./graphics-server.md#archive-naming).
- **availableLocations.lynx** — whether matching archives may be promoted/searchable in [Lynx](./glossary.md#publishing-destinations).
- **availableLocations.connect** — whether matching archives may publish to [Reuters Connect](./glossary.md#publishing-destinations).
