---
'@reuters-graphics/graphics-kit-publisher': major
---

Previews are now published per git branch, so a feature branch no longer overwrites another branch's preview. `publish` cleans up every preview of the project, which it stopped doing in 3.0.

**BREAKING** — `reuters.preview` in `package.json` is now `{ root, branches }` rather than a single URL string:

```json
{
  "reuters": {
    "preview": {
      "root": "testfiles/2026/XXXXXXXXXXXX/",
      "branches": {
        "main": "https://graphics.thomsonreuters.com/testfiles/2026/XXXXXXXXXXXX/main/"
      }
    }
  }
}
```

`root` is an S3 key prefix, not a link — the openable URLs are the `branches` values. Existing projects migrate automatically on their next `preview` run, keeping their current hash and year.

**BREAKING** — `PKG.preview` is now a namespace rather than a string, matching `PKG.pack` and `PKG.archive(id)`:

```
PKG.preview              ->  PKG.preview.branch('main').url
PKG.preview = url        ->  PKG.preview.branch('main').url = url
PKG.dotPaths.preview     ->  PKG.dotPaths.preview.root
```

`getBasePath('preview')` is **unchanged** — it still returns a string and resolves the current branch for you, so page builders need no changes.

Two things to know if you publish previews from CI:

- Run `preview` once locally and commit `reuters.preview.root` first. In CI the publisher refuses to create one, because the `package.json` it writes is discarded with the runner — nothing would record where the files went, so they could never be cleaned up.
- Deleting preview files is disabled in CI, so previews published there are removed by the next `publish` run locally.
