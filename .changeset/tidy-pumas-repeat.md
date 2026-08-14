---
'@reuters-graphics/graphics-kit-publisher': minor
---

Give each branch its own preview, instead of every branch sharing one URL.

`preview` now publishes to a subdirectory named for the current branch, so two
people previewing at once no longer overwrite each other's build:

```
https://graphics.thomsonreuters.com/testfiles/2025/ayzrxlqerve/_branches/feat-new-map/
```

`main` and `master` still publish to the preview URL itself, so a project's
canonical preview link keeps working. Configure that with `preview.rootBranches`,
or turn the whole thing off with `preview.perBranch: false`.

Nothing to change in your project — `getBasePath('preview')` picks up the right
URL on its own. The branch part is derived per run and never written to
package.json, so the URL saved there stays the one every branch agrees on.

Pass `--branch <name>` to publish under a different name, or `--no-branch` to
publish to the preview URL itself.

Also fixes array options in `defineConfig`, which merged into their defaults
index by index rather than replacing them. Only `preview.rootBranches` ships a
non-empty array default, so this changes nothing for existing config — but it's
what makes `rootBranches: ['develop']` mean one root branch rather than
`['develop', 'master']`.
