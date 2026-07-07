---
name: Pack metadata
description: The pack metadata the publisher reads and writes — the package.json `reuters` key, the PKG getters, and metadata pointers that source values from project files.
---

# Pack metadata

Pack metadata lives in the project's `package.json`. It flows two ways:

1. **Sourced before upload** — values the **Sphinx server requires** to create or update a pack (title, slugs, authors, desk, description, contactEmail, …). Before uploading, the publisher fills each from a [metadata pointer](#sourcing-metadata-pointers) if one resolves, and otherwise **prompts the human running the CLI** to type it in. ✅ **You MAY write or edit this metadata.** Writing these values into `package.json` yourself satisfies the server's requirement up front, so the publisher already has them and the upload doesn't stall on interactive prompts an agent can't answer. Changes propagate to the server pack on the next upload.
2. **Written back after upload** — the graphics server returns IDs, URLs and timestamps (`pack` ID, archive `url`s, `published`/`updated`/`uploaded`, `preview`, `separateAssets`, `homepage`, and each archive's `editions` list), which the publisher saves under the `reuters` key. ⛔ **NEVER write or edit this metadata.** It reflects authoritative server state; editing it desynchronizes the local project from the graphics server and can corrupt or orphan the pack. Only the publisher should write these values.

## The `reuters` key

After uploading, metadata is saved mostly under `reuters` (plus a top-level `homepage`):

```jsonc
{
  "reuters": {
    "preview": "https://graphics.thomsonreuters.com/.../",       // preview URL
    "separateAssets": "https://graphics.thomsonreuters.com/.../assets.zip",
    "graphic": {
      "pack": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",             // pack ID in Sphinx
      "desk": "london",
      "slugs": { "root": "ROOT-SLUG", "wild": "WILD" },
      "contactEmail": "jane.doe@thomsonreuters.com",
      "title": "A title",
      "description": "Graphic",                                    // defaults to "Graphic"
      "authors": [{ "name": "Jane Doe", "link": "https://www.reuters.com/authors/jane-doe/" }],
      "published": "2025-02-23T00:00:00.000Z",                     // first publish
      "updated": "2025-02-24T00:00:00.000Z",                       // latest publish
      "archives": {
        "public": {
          "url": "https://www.reuters.com/graphics/.../",
          "title": "A title",
          "description": "A description",
          "uploaded": "2025-02-24T00:00:00.000Z",
          "editions": ["interactive"]
        },
        "media-en-page": {
          "url": "https://www.reuters.com/graphics/.../",
          "editions": ["interactive", "media-interactive", "EPS", "JPG"]
        }
      }
    }
  },
  "homepage": "https://www.reuters.com/graphics/.../"              // set if a `public` archive exists
}
```

The `archives` object is keyed by **archive ID** (e.g. `public`, `media-en-page`); each records its URL, title/description, last-uploaded timestamp and the list of editions it contains.

Within this block, only the **human-authored** fields may be edited — an archive's `title` and `description`, and the pack-level `title`, `description`, `desk`, `authors`, `slugs` and `contactEmail`. Editing them updates the server pack on the next upload. ⛔ Everything the server writes back — `pack` ID, `url`s, `uploaded`/`published`/`updated`, `preview`, `separateAssets`, `homepage` and each archive's `editions` list — must **NEVER** be edited by hand; those tie the local project to server records and editing them desynchronizes or corrupts the pack.

## Required fields you may set

These fields are **required by the Sphinx server** to upload a pack _and_ are human-authored, so an agent may fill or edit them (rule 1 above). Pre-filling them lets an upload run without stopping for CLI prompts — **except the slugs, which you should ask the user for** (see below).

Under `reuters.graphic`:

| Field | Requirement |
|---|---|
| `desk` | One of `london`, `new york`, `singapore`, `bengaluru`. |
| `slugs.root` | Strict server pattern; identifies the graphic in URLs. **Ask the user — do not invent one** (see below). |
| `slugs.wild` | Strict server pattern; **may be `""`** (empty). **Ask the user** (see below). |
| `language` | RNGS language code: one of `en`, `ar`, `fr`, `es`, `de`, `it`, `ja`, `pt`, `ru` (usually `en`). |
| `title` | The graphic pack's title. Describes the specific topic the graphics pack covers, e.g., "Iran crisis blog". 3–150 characters. |
| `description` | The graphic pack's description. Often kept as short as the string "Graphic:". 3–150 characters. |
| `contactEmail` | A valid email ending in `@thomsonreuters.com`. |
| `authors` | Array with **at least one** entry; each requires a `name` (≥3 chars) and a `link` (valid URL). (Sourced by the publisher from the `byline` pointer.) |

Under each `reuters.graphic.archives.<id>`:

| Field | Requirement |
|---|---|
| `title` | The archive's specific title (≥3 chars). Describes the specific graphic it contains. Shares a 255-char budget with the pack title — see below. |
| `description` | The archive's description; **doubles as the graphic's alt text**. Shares a 255-char budget with the pack description — see below. |

Everything else — the pack-level `pack`, `preview`, `separateAssets`, `published`, `updated`, top-level `homepage`, and each archive's `url`, `uploaded` and `editions` — is written by the server. ⛔ Never set or edit those (rule 2).

### Slugs: ask the user, don't generate them

`slugs.root` and `slugs.wild` identify the graphic in the graphics server and in its public URLs, and the server validates them against strict patterns. A wrong or invented value is costly to change later. **Prompt the user for both** rather than guessing — do not derive them from the project name, title or filenames.

Roughly, to _validate_ what the user provides:

- **root** — uppercase segments joined by hyphens: 2–5 segments, at least one hyphen; each segment is letters/digits plus `&`, `.`, `'`, with single spaces allowed inside a segment. Example: `HEALTH-CORONAVIRUS`.
- **wild** — uppercase letters/digits with `&`, `.`, `'`, `-` and spaces; **may be empty**; may end with a parenthetical list like `(MAP, CHART)`. Example: `MAP`.

The exact regexes — and the rules for every other field in this section (lengths, email domain, author shape, allowed `desk`/`language` values) — are defined by the publisher's [valibot](https://valibot.dev/) schemas in `src/validators/pack.ts`. **Treat that module as the source of truth** rather than copying patterns here, which can drift.

### Title & description share a 255-char budget with the pack

For each archive, the server caps the **combined** length of the pack string and the archive string at 255 characters:

- `archive.title` length must be `< 255 − pack.title` length
- `archive.description` length must be `< 255 − pack.description` length

Because the **archive description is also used as the graphic's alt text**, the convention is to keep the **pack `description` very short** — often just `"Graphic:"` — so the archive description keeps as much of the 255-char budget as possible to describe the graphic well. Keep the pack `title` short for the same reason. (The pack's own `title`/`description` are still independently capped at 150 characters.)

## Reading metadata: the `PKG` module

Use `PKG` getters for typed access instead of reading `package.json` directly:

```typescript
import { PKG } from '@reuters-graphics/graphics-kit-publisher';

PKG.homepage;                       // 'https://www.reuters.com/graphics/.../'
PKG.preview;                        // preview URL
PKG.separateAssets;                 // S3 assets.zip URL
PKG.pack.id;                        // Sphinx pack ID
PKG.pack.desk;                      // 'london'
PKG.pack.rootSlug;                  // 'ROOT-SLUG'
PKG.pack.wildSlug;                  // 'WILD'
PKG.pack.language;                  // 'en'
PKG.pack.contactEmail;
PKG.pack.title;
PKG.pack.description;               // defaults to 'Graphic'
PKG.pack.authors;                   // [{ name, link }, ...]
PKG.pack.published;                 // ISO timestamp of first publish
PKG.pack.updated;                   // ISO timestamp of latest publish

// Archive metadata is accessed by archive ID:
PKG.archive('media-en-page').url;
PKG.archive('media-en-page').title;
PKG.archive('media-en-page').description;
PKG.archive('media-en-page').uploaded;
PKG.archive('media-en-page').editions;   // ['interactive', 'media-interactive', 'EPS', 'JPG']
```

The `PKG` properties technically work as setters too (the publisher uses them internally), but **avoid setting them** — e.g. `PKG.homepage = '...'` is almost always a mistake.

## Sourcing metadata: pointers

`metadataPointers` in `publisher.config.ts` tell the publisher where to read metadata values from other files (JSON or built HTML) so it doesn't have to prompt for everything.

A pointer is either a shorthand `path` string or an object:

```typescript
{
  path: 'locales/en/content.json?story.authors',   // "<file path>?<data path within file>"
  format: (value: string[]) => value.join(', '),   // optional: transform the found value
  validate: (value: string) => value.length > 3,   // optional: reject invalid values
  promptAsInitial: false,                           // optional: prefill a prompt vs. use directly
}
```

### Path syntax

`path` combines a relative file path and a query into that file, separated by `?`:

- `locales/en/content.json?story.title` → the `story.title` value in that JSON file.
- `dist/index.html?title` → the `<title>` of the built HTML.
- `dist/index.html?meta.og:description` → a meta tag's content.
- `~/.reuters-graphics/profile.json?email` → a value from the user's local profile.

`format` runs on the found value; `validate` returns `true`/`false` to accept/reject; `promptAsInitial: true` uses a found value as the initial value of a user prompt rather than accepting it silently.

### Pointer groups and defaults

```typescript
export default defineConfig({
  metadataPointers: {
    pack: {
      rootSlug: 'locales/en/content.json?story.rootSlug',
      wildSlug: 'locales/en/content.json?story.wildSlug',
      desk: { path: '~/.reuters-graphics/profile.json?desk', promptAsInitial: true },
      language: 'en',                                   // no shorthand — a bare string is a language code
      title: 'dist/index.html?title',
      byline: 'locales/en/content.json?story.authors',
      contactEmail: '~/.reuters-graphics/profile.json?email',
    },
    edition: {
      title: 'index.html?title',                        // file path is relative to the edition root
      description: 'index.html?meta.og:description',
    },
  },
});
```

- `pack.*` pointers source pack-level metadata. `pack.language` is special: a bare string is treated as a literal RNGS language code, not a pointer path.
- `edition.*` pointers source per-edition metadata; their file paths are **relative to each edition's root folder**.
