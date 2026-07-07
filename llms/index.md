---
name: '@reuters-graphics/graphics-kit-publisher'
description: Publishing Reuters Graphics projects to the Sphinx graphics server — packing built files into archives/editions, pack metadata, routing rules, and the graphics server model.
---

# Graphics kit publisher

A filesystem-based publisher for Reuters Graphics projects. It takes a project's **built files** — dotcom pages, embeddable pages and static graphics — matches them to a filesystem pattern, packs them into the archive/edition structure the **Sphinx graphics server** expects, and uploads them for publishing to [reuters.com](https://www.reuters.com/graphics/) and to media clients via [Reuters Connect](https://www.reutersconnect.com/).

It makes few assumptions about how a project is built, so it works with any page builder that outputs a predictable pattern of files (a good fit for filesystem-routed frameworks like SvelteKit and Next.js).

## When to read which doc

Read these on demand — pull the one relevant to the task rather than loading all of them.

| Doc                                          | When to use                                                                                                                                                                                                                                                               |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`graphics-server.md`](./graphics-server.md) | Understanding how the Sphinx graphics server represents projects: graphic packs, archives, editions, root files, edition types, and where each publishes (RNGS / Lynx / Connect).                                                                                         |
| [`pack-metadata.md`](./pack-metadata.md)     | Working with pack metadata in `package.json` (the `reuters` key), the `PKG` getters, or metadata pointers — including **pre-filling the metadata Sphinx requires** so a CLI upload won't stall on prompts, and which server-written fields must **never** be hand-edited. |
| [`page-building.md`](./page-building.md)     | Routing/build rules the publisher enforces: directory-based pages, canonical links, base paths, the two-pass production build, preview images, and `packLocations` config.                                                                                                |
| [`config.md`](./config.md)                   | Reference for all `publisher.config.ts` options: `build`, `packLocations`, `metadataPointers`, `archiveEditions`, `embedTemplate`, `publishingLocations`.                                                                                                                 |
| [`glossary.md`](./glossary.md)               | Definitions of key terms, especially graphics-server concepts (pack, archive, edition, slug, desk, RNGS, Lynx, Connect).                                                                                                                                                  |

## Setup

The publisher is configured with a `publisher.config.ts` in the project root:

```typescript
// publisher.config.ts
import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

export default defineConfig({
  // Config options — all optional; sensible defaults apply.
});
```

Config groups: `build` (build scripts + outDir), `packLocations` (where built files live), `metadataPointers` (where to source metadata), `archiveEditions` (client source archives + separate assets), `embedTemplate`, and `publishingLocations` (where archives may publish). See [config.md](./config.md) for the full option reference.

## Workflow

The publisher is driven by a CLI (`graphics-publisher`) with three main commands, normally run in order:

1. `graphics-publisher preview` — Build and upload a preview to the testfiles S3 bucket (no graphics server pack created).
2. `graphics-publisher upload` — Create/update the graphic pack in the graphics server and upload archives. `upload:quick` uploads only the `public` archive (the reuters.com page); run a full `upload` afterward to sync embeds and Connect editions.
3. `graphics-publisher publish` — Publish the pack in the graphics server.

`preview`, `upload` and `publish` all run the project's build scripts first; a failed build aborts the command. Build output is written to `.graphics-kit/logs/` (`error.log`, `out.log`) — **check `error.log` first** when a command fails at the build step. See [page-building.md](./page-building.md#build-logs--diagnosing-failures).

Recovery commands: `restart` (clear pack IDs/URLs from `package.json` to create a fresh pack next upload, preserving other metadata) and `delete` (delete the pack in the server and clear its metadata — only possible if the pack has **not** yet published).

Programmatic entry points are exported from the package root, including `defineConfig`, the `getBasePath` utility, and the `PKG` metadata module.
