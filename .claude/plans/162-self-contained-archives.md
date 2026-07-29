# #162 — Self-contained archives via single build + URL rewrite

Task plan. Reference: [issue #162](https://github.com/reuters-graphics/graphics-kit-publisher/issues/162), which holds the
research, empirical validation and design-decision rationale. **This document does not restate that
argument** — it records the flow we're building, the decisions the issue left open, and the sequenced
work.

Baseline: `main` @ 60da504 (after #163; #164 adds the temp-project test harness this plan's tests rely on).

---

## Goals

1. **One build, not two.** Build once against a placeholder base URL; per-archive string-rewrite the
   output to each archive's own reserved URL.
2. **Self-contained archives.** Each embed archive carries its own `cdn/` copy and references it at its
   own URL, so a skipped archive keeps working when others are re-uploaded.
3. **User-selected uploads.** `upload --archives …` or an interactive multiselect; skipping is safe
   because of (2).
4. **All prompting front-loaded** (new in this plan, not in the issue). One interactive phase; after
   it, the run is unattended. Today a brand-new embed's title/description prompt fires *in the middle*
   of a serial upload loop, minutes in — `src/pack/archive/index.ts:48-50` inside the loop at
   `src/pack/index.ts:111-113`.

Corollary goal: **fail before the first byte.** Everything that can be validated — credentials, token,
metadata, selection — is validated in the interactive phase, before any server mutation or upload.

---

## Target flow

`upload` becomes seven phases. Only Phase 3 is interactive.

| Phase | Name | Interactive | Server | What happens |
|---|---|---|---|---|
| 0 | Preflight | first upload only² | first upload only² | `precheck()`; shape-check credentials (no server call — D6); `ensurePackId()` then `separateAssets.setUrl()` (D4) |
| 1 | Build | no | no | **One** production build against the placeholder base |
| 2 | Discover | no | no | `Finder` over the placeholder output → archives + editions; `logFound()` |
| 3 | **Decide & collect** | **yes** | no | (a) archive selection → (b) pack metadata → (c) per-archive metadata for *selected* archives → (d) validate everything → (e) summary + one confirm |
| 4 | Reserve | no¹ | write | **Warm the token first**; create/update the pack; dummy-zip upload per selected archive lacking a URL; persist URLs |
| 5 | Assemble | no | no | Per selected archive: copy page (hoist) + copy `cdn/` → rewrite → self-verify → SRI → preview image/manifest → zip |
| 6 | Upload & report | no | write | Serial upload of selected archives; separate assets; report uploaded / skipped / URLs |

¹ Not guaranteed: for users whose credentials lack `GFX_` rights, the token paste prompt
(`src/server/token.ts:101`) can still fire in Phases 4 and 6. See D6 — it's mitigated, not eliminated.

² `ensurePackId()` is a no-op whenever `reuters.graphic.pack` is already cached, i.e. on every upload
after a project's first. Only the first-ever upload prompts for pack metadata and creates the pack here;
see D4 for why that can't wait until Phase 4.

Ordering notes that fall out of the current code:

- **Build before prompting fixes a latent bug.** `pack.title`'s default pointer is
  `dist/index.html?title` (`src/config/index.ts:43-60`), but today it's read at
  `src/pack/index.ts:102` — *before* the build, and every build rimrafs `dist/`
  (`src/build/clean.ts:7-10`). So it resolves against the previous run's output, or prompts. After the
  reorder it resolves against the fresh build, as intended.
- **Selection precedes metadata collection.** Skipped archives need neither metadata nor a reserved
  URL, so asking "which archives?" first means fewer prompts.
- **Embed metadata can't move into Phase 3.** `Archive.getMetadata()` currently also computes
  `metadata.embed` from the archive's URL (`src/pack/archive/index.ts:60-70`), which doesn't exist
  until Phase 4. That method must split — see M3.

---

## Decisions this plan makes (beyond the issue)

**D1 — The placeholder is delivered through `getBasePath`, gated by an env var the publisher sets.**
`getBasePath` has **zero internal consumers** (`src/basePaths.ts`, re-exported at `src/index.ts:13`);
downstream `svelte.config.js` / `vite.config.ts` are the only callers. To keep the issue's "no required
downstream config changes" promise, `getBasePath('prod')` returns the placeholder when the publisher
sets a sentinel env var on the build it spawns. `src/build/index.ts:43-46` currently passes **no `env`**
to `spawn` — that's the hook to add.

**D2 — The placeholder must be distinctive in its *path*, not just its host.** Downstream uses
`rootRelative: true` for `paths.base` (`bluprint_graphics-kit/svelte.config.js:43-48`), and
`getRootRelativePath` strips `protocol//host` (`src/basePaths.ts:7-11`). So the origin is *gone* from
much of the output and the sentinel must survive in the path. It must also be a valid URL and satisfy
`src/validators/archive.ts:3-14`, which requires hostname `www.reuters.com`. Proposed:
`https://www.reuters.com/graphics/__GKP_BASE__/` — valid, right host, contiguous, unique, and its
root-relative form `/graphics/__GKP_BASE__/` is equally distinctive.

**D3 — Rewrite mappings are longest-match-first, and there are three.** Per the issue: page path →
archive root, `{placeholder}/cdn` → `{archive-url}/cdn`, residual root-relative base → archive root.
Add a third target: **the separate-assets URL** (D4).

**D4 — Don't rewrite the separate-assets URL. Ensure a pack ID exists before the build instead.**

`separateAssets` exists to give clients a permanent copy of **source** files too big to commit — files
that are gitignored and therefore absent from the `app.zip` shipped with embeds. There is exactly one
such bundle **per project**, keyed by pack ID (`src/separateAssets/index.ts:72-77`), and it contains no
built output. Per-archive variation would be meaningless, so it stays out of the rewrite.

That leaves the ordering constraint it creates: `setUrl()` needs `PKG.pack.id` and runs *before* the
build today (`src/pack/index.ts:105`) so the app can bake the link in — and the downstream kit types it
for app use (`bluprint_graphics-kit/src/global.d.ts:34`), so some projects do read it at build time.

The resolution is that the pack ID is **only unknown on a project's first-ever upload**; after that it's
cached in `package.json` (`reuters.graphic.pack`, written at `src/pack/index.ts:95`). So Phase 0 gets an
`ensurePackId()` step:

- **Pack ID already cached** (every returning project — the case #162 exists to improve): no server call,
  no prompts. `setUrl()` runs, the build follows, and Phase 3 remains the single interactive phase.
- **No pack ID yet** (first upload only): prompt pack metadata and create the pack, then build. The user
  sees two interactive moments on the run where they're setting the project up from scratch anyway.

Pack *update* (as opposed to creation) stays in Phase 4 with the rest of the server writes.

This generalises: any server-derived value an app bakes at build time must exist before the build. The
placeholder + rewrite covers every such value that varies per archive; the pack ID is the only one that
doesn't vary, and it's stable, so a one-time `ensurePackId()` is the whole fix.

Cost to accept: on a first upload the pre-build `createGraphic` call acquires a token, so a user whose
credentials lack `GFX_` rights may be prompted to paste one before the build *and* again at Phase 4 if
the build and prompting together outlast the 15-minute cache (D6).

**D5 — SRI moves to the staged copy, after rewrite.** Today `addSRI` mutates files **in `dist/`** before
copying (`src/pack/edition/types/interactive.ts:129-139`), which cannot be per-archive-correct once each
archive's copy has different bytes. It must run on `<staging>/<archive-id>/interactive/**` after the
rewrite and before `zipDir`. Its "resource under canonical path" branch (`src/utils/sri.ts:162-169`)
resolves cleanly post-hoist, so this gets *simpler*. Also: stop swallowing its errors silently, or at
least never route the zero-residual assertion through that swallow.

**D6 — Warm the token at the start of Phase 4, not Phase 0 — and keep Phase 0 non-interactive.**
The paste prompt (`src/server/token.ts:92-120`) is a *fallback*, not the normal path: `getToken()` POSTs
credentials (`:24-48`) and only prompts on a 401 or when the JWT lacks `GFX_` rights (`:152-168`). Our
15-minute cache covers **only the pasted token** (`:50-66`, written at `:117`) — a credentials-derived
token isn't cached at all. So the clock is only relevant to the lacks-`GFX_`-rights cohort, and it
starts when they paste.

That makes Phase 0 the wrong place to warm: the interactive phase could burn several minutes of a
15-minute window before the first upload starts. Warm at the top of Phase 4 instead, so the window
covers the uploads.

Phase 0 still does the *non-interactive* half: `getServerCredentials()`
(`src/server/credentials.ts:37-61`) throws `UserConfigError`/`ServerCredentialsError` on missing or
malformed credentials without touching the network, so that class of failure surfaces before the build.

**Residual, worth its own issue rather than blocking this one:** `server-client` calls `_getToken()` on
**every request** (`node_modules/@reuters-graphics/server-client/dist/index.js:1270`, `:1297`, `:1335`,
`:1348`, `:1384`, `:1423`), each re-POSTing credentials. For the pasted-token cohort that means every
request 401s and falls back to the cache, so an upload longer than 15 minutes — nine archives at 2–5
minutes each, exactly the case #162 exists to fix — re-prompts mid-run regardless of where we warm.
The durable fixes are to hold one validated token for the run, or read `exp` from the JWT and refresh
deliberately. Out of scope here; note it and move on.

**D7 — Validate metadata, don't just short-circuit on it.** `isValid(...)` at `src/pack/index.ts:46`
and `src/pack/archive/index.ts:37` are used only as caching short-circuits — nothing throws, so a bad
pointer-sourced value (e.g. a non-`@thomsonreuters.com` email from `profile.json`) reaches the server.
Phase 3(d) validates and throws with a clear message.

**D8 — Archive contents keep today's asymmetry.** Decided:

- **Public archive** — unchanged: the whole build, `embeds/**` included, because it packs from
  `dirname('dist/index.html')` (`src/pack/edition/types/interactive.ts:124-125`; asserted at
  `src/pack/edition/types/interactive.test.ts:51-54`). Once embeds are self-contained those copies are
  redundant, but dropping them would change which paths are served under the public URL, and nothing
  requires us to take that risk here.
- **Media archives** — their own hoisted page plus a copy of `cdn/`. Nothing else: no other embeds'
  pages, no dotcom page. This matches the issue's wording and keeps archives as small as
  self-containment allows.

Consequence to accept: an embed's client-side router has no other pages inside its archive, so a
route navigation *within* an embed can only resolve if it's a route the embed itself renders. Whole-`cdn`
already prevents missing-*chunk* 404s (issue Risk #2); missing-*page* navigation is out of scope, and
embeds don't do it today.

Consequence for the code: assembly stays two paths (public = whole build, media = page + `cdn/`), so
`Interactive.packUp` keeps its `archive.type` branch rather than becoming uniform.

---

## Milestones

Each is a PR. M0 is disposable. M1–M5 are sequential; M6 rides along with whichever milestone changes
the surface it documents.

### M0 — Spike: prove a self-contained archive serves (throwaway, no library changes)

The issue's Risk #1 and the only genuinely unvalidated assumption. The appendix validated *rewriting*;
it did not validate *serving* a rewritten, self-contained archive from the graphics server.

- Take a real graphics-kit build. Hand-assemble one embed archive: hoist the page, copy `dist/cdn/`,
  rewrite the base to a URL you've reserved, zip.
- Upload to a **scratch pack**, load the embed, confirm: assets 200, canonical correct, no console
  404s, client-side navigation inside the embed doesn't request absent chunks.
- **Exit:** it serves — or the design changes before any refactor. Delete the scratch pack after.

### M1 — The rewrite module (`src/rewrite/`)

Pure, dependency-light, heavily tested. No flow changes; nothing calls it yet.

- `rewriteDir(dir, mappings)` — longest-match-first replacement across all text files (HTML/JS/CSS/JSON/
  `.map`; downstream ships `build.sourcemap: true`, `bluprint_graphics-kit/vite.config.ts:28`).
  Binary files untouched.
- `assertNoResidualPlaceholder(dir)` — fails loudly with file:line list. Also assert no
  `sveltekit-prerender` host (issue's belt-and-suspenders).
- Handle percent-encoded forms of the placeholder (issue Risk #3).
- **Tests** use the temp-project harness from #164 (`src/__test__/project.ts`): real files, real dirs.
- **Exit:** `pnpm test` green on 20/22/24; module unused in production paths.

### M2 — Placeholder base + single build

- `src/basePaths.ts`: placeholder return for `prod` under the D1 env var; keep `dev`/`test`/`preview`
  behaviour byte-identical (`preview` especially — `src/preview/index.ts` is untouched by this plan and
  must not regress).
- `src/build/index.ts`: pass `env` to `spawn` with the sentinel set.
- `src/pack/index.ts`: delete the second `buildForProduction()` (`:114`).
- Fix the two URL-from-built-HTML readers that would otherwise see the placeholder:
  `MediaInteractive.makeDoc` takes `embedUrl` from the built canonical
  (`src/pack/edition/types/media-interactive.ts:43-59`) → source it from `PKG.archive(id).url` instead.
  `getPreviewImagePath` (`src/pack/edition/utils/getPreviewImgPath.ts:47-67`) is fine — it only needs
  canonical and `og:image` to share a base, which they do.
- **Exit:** `upload` still works end-to-end against a scratch pack with hub-and-spoke archives (i.e.
  rewrite not yet wired in) — one build, no behaviour change visible to the server.

### M3 — Phase restructuring + front-loaded prompting

The heart of the user-facing change; no rewriting yet.

- Split `Archive.getMetadata()` (`src/pack/archive/index.ts:36-72`) into:
  - `collectMetadata()` — title/description prompts only (Phase 3), and
  - `finalizeEmbedMetadata(url)` — the `embedTemplate` render (Phase 4, non-interactive).
- Move URL reservation out of metadata: `Interactive.getUrl()`
  (`src/pack/edition/types/interactive.ts:36-121`) becomes a Phase 4 step over selected archives,
  keeping its existing "already has a URL" short-circuit (`:37-38`) so URLs stay stable across uploads.
- Reorder `Pack.upload()` to the seven phases. Pack **update** moves to Phase 4; pack **creation** stays
  before the build behind `ensurePackId()`, which no-ops for any project that has been uploaded before
  (D4). `separateAssets.setUrl()` keeps its current position, right after that.
- Add Phase 0 preflight (credentials shape-check + `ensurePackId`) and Phase 4 token warm-up (D6), plus
  Phase 3(d) validation (D7).
- Add the Phase 3(e) summary + single confirm: archives to upload, editions per archive, which are new
  vs. updates, what's being skipped.
- Fix `edition.*` pointer resolution while we're here: `index.html?title` currently resolves against
  `process.cwd()`, not the edition root (`src/pack/archive/metadata.ts:22`, `:38` → `utils.fs.get`),
  contradicting `llms/pack-metadata.md:240`. Front-loading makes the wrong behaviour more visible.
- **Exit:** a returning user with a new embed sees *all* prompts before any upload starts; CI path
  unchanged; `git status` clean after tests.

### M4 — Self-contained assembly

- `Interactive.packUp` (`src/pack/edition/types/interactive.ts:123-147`): for media archives, also copy
  `dist/cdn/**` into `interactive/cdn/`. Then, per archive: rewrite (M1) → assert zero residuals → SRI
  on the staged copy (D5) → preview image → manifest → zip.
- **Remove the double pack.** `Archive.createOrUpdate()` calls `packUp()` again
  (`src/pack/archive/index.ts:99`) after `Pack.packUp()` already did (`src/pack/index.ts:128`), and
  `zipDir` deletes the staging dir (`src/utils/zipDir.ts:37`), so everything — including `sharp` image
  generation and SRI — runs twice.
- Revisit `zipDir`: it buffers whole archives in memory with no compression level
  (`src/utils/zipDir.ts:7-31`). Per-archive `cdn/` copies multiply archive size, so set a compression
  level and consider streaming to disk.
- Per D8, the public archive's contents don't change and the `archive.type` branch in `packUp` stays.
- Update the tests that currently *assert* hub-and-spoke:
  `src/pack/edition/types/interactive.test.ts:110-116` asserts a media archive has **no**
  `interactive/cdn/scripts/app.js` — that assertion inverts.
- **Exit:** locally assembled archive is byte-inspectable and contains its own `cdn/`; zero residual
  placeholders; scratch-pack upload serves (M0's finding, now automated end-to-end by hand once).

### M5 — Selection

- `--archives <slugs>` on `upload` (`src/cli.ts:84-88`, threaded through `src/index.ts:32-37` →
  `Pack.upload()`); validate slugs against discovered archives and list valid ones on error.
- Interactive multiselect when no arg (reuse `src/prompts/multiselect.ts`, already used by `publish`).
- CI (`utils.environment.isCiEnvironment()`) with no arg → upload all, i.e. today's behaviour.
- `upload:quick` becomes sugar for `--archives public`; note it currently diverges via
  `finder.findEditions(publicOnly)` (`src/finder/index.ts:36-44`) and skipping separate assets — decide
  whether selection replaces the `publicOnly` flag entirely.
- **Exit:** selecting one of several archives uploads exactly one; skipped archives still serve.

### M6 — Docs + changeset

`docs/content/docs/page-builders.mdx:105-129` and `llms/page-building.md:61-70` document the two-pass
build explicitly and must be rewritten; `llms/glossary.md:68` defines "Two-pass build" as a term.
Also: `docs/content/docs/sphinx.mdx:78-89` (interactive edition file tree gains `cdn/`),
`docs/content/docs/commands.mdx:26-62` (`upload` / `upload:quick`), `docs/content/docs/package.mdx`,
`docs/content/docs/Config/build.mdx`, and the `getBasePath` JSDoc at `src/basePaths.ts:48-96` (rendered
into API docs). `HOME.md:143-164` states the invariant this change reverses — update or retire it.

Changeset: **minor**. Add it in the final commit so the open patch-release PR (#165) stays independently
mergeable until then.

---

## Verification

- **Unit** — the #164 harness gives every test file a real temp project, which suits this work: rewrite
  fixtures, staged-archive assembly and zip contents are all real-filesystem assertions. Run on
  20/22/24 (`/usr/local/n/versions/node/{20.20.2,22.22.3,24.16.0}`).
- **Downstream** — `pkg.pr.new.yaml` triggers on bare `on: push`, so *any* branch push publishes an
  installable preview. Test each milestone in a real graphics-kit project before opening the PR.
- **Server** — a scratch pack for M0, M4 and M5; delete it afterwards (`graphics-publisher delete`).
- **Invariants to assert in CI** — zero residual placeholder tokens; each media archive contains
  `interactive/cdn/`; `git status` clean after the suite.

---

## Risks

1. **Serving from own URL is still unproven** (M0). Everything else depends on it.
2. **The placeholder must survive the whole toolchain** — `paths.assets` absolute, `paths.base`
   root-relative, `__BASE_URL__` fully-qualified, sourcemaps. D2 addresses the root-relative case; the
   self-verify assertion is the backstop.
3. **Archive size** grows by one `cdn/` copy per embed. Accepted by the issue (server processing time,
   not size, is the limiter), but `zipDir`'s in-memory buffering makes it our problem locally.
4. **`upload:quick` and CI defaults** are the compatibility surface most likely to surprise people.
5. **Two copies of the mode ladder downstream** (`svelte.config.js` and `vite.config.ts`, with a "keep
   in sync" comment) — if D1's env gating is ever bypassed by an app computing its own base, the
   self-verify assertion catches it at pack time rather than in production.

---

## Appendix — today's flow, measured

`Pack.upload()` (`src/pack/index.ts:101-120`):

```
:102  getMetadata()          pack prompts (desk, rootSlug, wildSlug, language, title, byline, email)
:103  createOrUpdate()        server: create/update pack → PKG.pack.id
:105  separateAssets.setUrl() writes PKG.separateAssets (needs pack id)
:107  buildForProduction()    ★ BUILD 1 — base path is '' because homepage is unset
:108  Finder.findEditions()   discovery (filename/glob only; no URL dependence)
:111  archive.getMetadata()   ← per archive: PROMPTS + dummy-zip upload reserving the URL + embed code
:114  buildForProduction()    ★ BUILD 2 — now getBasePath('prod') returns homepage
:115  packUp()                stage + zip every archive
:117  archive.createOrUpdate() packs AGAIN, then uploads serially
:119  separateAssets.packAndUpload()  S3
```

Why two builds: `getBasePath('prod')` reads **only** `PKG.homepage` (`src/basePaths.ts:31`), which the
dummy upload writes at `src/pack/edition/types/interactive.ts:115-117`. Build 1 exists to discover
parts before URLs exist; build 2 to bake them in. On a re-upload, `getUrl()` short-circuits, nothing
changes between the builds, and **build 2 is pure waste**.

Hub-and-spoke, precisely: every page's base path is the *public* archive's URL, so embed HTML references
`{homepage}/cdn/...`, and a media archive's `packUp` copies only its own page directory
(`cdn/` is outside it). Asserted at `src/pack/edition/types/interactive.test.ts:110-116`.
