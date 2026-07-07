---
name: Graphics server (Sphinx)
description: How the Sphinx graphics server represents projects — graphic packs, archives, editions, root files, edition types, and publishing locations.
---

# Graphics server (Sphinx)

The publisher uploads projects to Reuters' **Sphinx graphics server**. Everything the publisher does is in service of producing the structure Sphinx expects. That structure has three nested levels:

- **Graphic pack** — the overall project. Contains one or more archives.
- **Archive** — a ZIP uploaded to the server. Represents a single graphic or a set of HTML pages. Contains one or more editions. Must contain at least one edition.
- **Edition** — a specific _format_ of a graphic (an interactive page, an embeddable app, a static image, an editable file).

```
graphic pack
├── public.zip                 ← archive
│   └── interactive            ← edition
├── media-en-map.zip           ← archive
│   ├── interactive            ← edition
│   ├── media-interactive      ← edition
│   ├── PNG                    ← edition
│   └── EPS                    ← edition
```

On the local filesystem, an archive is a folder containing one or more edition folders. The publisher zips each archive folder before upload.

## Archive naming

Archives are named by convention:

- `public.zip` — the reuters.com page(s).
- `media-{locale}-{slug}.zip` — a media/client archive.

Where:

- **locale** is a valid RNGS language code (`en`, `de`, `es`, …).
- **slug** identifies the graphic (`map`, `bar-chart`, `page`, …).

## Editions

Each edition is a folder containing a **root file** at its top level. The root file's type determines the edition's format and which publishing options the server offers. `.html` takes precedence when present; other root types: `.txt`, `.jpg`, `.png`, `.pdf`. If multiple files of the same type sit at the root, the first added to the zip wins — and the add order **cannot** currently be controlled, so keep a single unambiguous root file.

### Edition types

| Edition                              | Root file                                       | Contains                                 | Represents                                                            |
| ------------------------------------ | ----------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| **interactive**                      | `index.html`                                    | HTML page(s) + assets                    | A page published on reuters.com                                       |
| **media-interactive**                | `README.txt`                                    | a zipped copy of the project (`app.zip`) | An embeddable graphic purchasable/embeddable via Connect, Lynx or Arc |
| **static** (`JPG`/`PNG`/`EPS`/`PDF`) | file matching the edition name (e.g. `map.png`) | one static/editable file                 | A static image (JPG/PNG) or editable source (EPS/PDF)                 |

Notes:

- **interactive**: additional HTML pages should be at least one directory below the root `index.html`; CSS/JS/images may sit alongside it. Requires a preview image at the edition root (`_gfxpreview.png`/`.jpg`) or an `og:image` in the page.
- **media-interactive**: also requires a preview image at the edition root.
- **static**: the root file can be named anything but should match the edition's type (e.g. the `PNG` edition's root is a `.png`). An edition folder may hold companion files (e.g. an `EPS` edition containing both `my-map.eps` and a `map.jpg`).

## Where editions publish

Editions ultimately reach readers on reuters.com or media clients on Reuters Connect. Two publishing "locations" gate this, plus a searchability flag:

- **Public RNGS** — a public URL on reuters.com. Available only to **interactive** editions and **JPG/PNG** static editions.
- **Media (Reuters Connect)** — a purchasable graphic on Connect. Available only to **media-interactive** editions and **EPS/PDF** static editions.
- **Searchable in Lynx** — makes an edition embeddable in other reuters.com stories via Lynx/Arc embed tools. Only **interactive** editions should be made searchable. The publisher sets this automatically when publishing from the terminal.

Summary of routing:

| Edition            | Public RNGS | Reuters Connect | Lynx searchable       |
| ------------------ | ----------- | --------------- | --------------------- |
| interactive        | ✅          | —               | ✅ (interactive only) |
| media-interactive  | —           | ✅              | —                     |
| JPG / PNG (static) | ✅          | —               | —                     |
| EPS / PDF (static) | —           | ✅              | —                     |

Publishing options are set per edition and determine if and where a graphic actually publishes. See [pack-metadata.md](./pack-metadata.md) for how archive/edition state is recorded, and [page-building.md](./page-building.md) for how local built files map to these editions.
