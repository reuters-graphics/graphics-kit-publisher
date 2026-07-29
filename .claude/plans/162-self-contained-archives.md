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

Corollary goal: **fail before the first byte.** Everything that can be validated — credentials, metadata,
selection — is validated before any server mutation or upload. Token acquisition is the accepted
exception (D6).

---

## Target flow

`upload` becomes seven phases. Only Phase 3 is interactive.

| Phase | Name | Interactive | Server | What happens |
|---|---|---|---|---|
| 0 | Preflight | first upload only² | first upload only² | `precheck()`; shape-check credentials (no server call — D6); `ensurePackId()` then `separateAssets.setUrl()` (D4) |
| 1 | Build | no | no | **One** production build against the placeholder base |
| 2 | Discover | no | no | `Finder` over the placeholder output → archives + editions; `logFound()` |
| 3 | **Decide & collect** | **yes** | no | (a) archive selection → (b) pack metadata → (c) per-archive metadata for *selected* archives → (d) validate everything → (e) summary (the selection prompt in (a) is the decision point; no separate confirm) |
| 4 | Reserve | no¹ | write | Create/update the pack; dummy-zip upload per selected archive lacking a URL; persist URLs |
| 5 | Assemble | no | no | Per selected archive: copy page (hoist) + copy `cdn/` → rewrite → self-verify → SRI → preview image/manifest → zip |
| 6 | Upload & report | no | write | Serial upload of selected archives; separate assets; report uploaded / skipped / URLs |

¹ "Not interactive" means *we* don't prompt. The token paste prompt (`src/server/token.ts:101`) can
still appear at any server call, in any phase, and that's fine — see D6.

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

**Why gated, rather than `prod` always meaning "placeholder":**

1. **Other people run the build.** `app.zip` ships the project's source in every media-interactive
   edition precisely so clients can customise and build it themselves, and `srcArchive` zips committed
   files, so the `package.json` in that zip carries a real `homepage`. A client's `npm run build` must
   keep producing real URLs — always-placeholder would hand them `__GKP_BASE__` with nothing to rewrite
   it. Same for a developer inspecting production output, or CI that builds without uploading.
2. **`getBasePath` is public API with a documented contract** (`src/basePaths.ts:48-96`): prod resolves to
   the URL the publisher saved to `package.json`. Always-placeholder would quietly make `homepage` dead
   for build purposes.
3. **It puts the fact where it's known.** Only the publisher knows a build is about to be rewritten
   per-archive; the app can't infer it and shouldn't have to.

The cost is version skew — the app's own copy of the library answers the call, so an older one ignores
the var and bakes real URLs silently (found while verifying M2). Hence M4's "assert the rewrite replaced
something". Always-placeholder has the mirror-image bug: an older CLI wouldn't rewrite and would ship
placeholders. Neither approach avoids needing that assertion.

**D2 — The placeholder must be distinctive in its *path*, not just its host.** Downstream uses
`rootRelative: true` for `paths.base` (`bluprint_graphics-kit/svelte.config.js:43-48`), and
`getRootRelativePath` strips `protocol//host` (`src/basePaths.ts:7-11`). So the origin is *gone* from
much of the output and the sentinel must survive in the path. It must also be a valid URL and satisfy
`src/validators/archive.ts:3-14`, which requires hostname `www.reuters.com`. Proposed:
`https://www.reuters.com/graphics/__GKP_BASE__/` — valid, right host, contiguous, unique, and its
root-relative form `/graphics/__GKP_BASE__/` is equally distinctive.

**D3 — Four mappings, applied longest-match-first.** Validated by the M0 spike:

| # | From | To |
|---|---|---|
| 1 | `{placeholder-abs}/embeds/{locale}/{slug}` | `{archive-url}` — the page path collapses to the archive root |
| 2 | `{placeholder-abs}` | `{archive-url}` |
| 3 | `{placeholder-rel}/embeds/{locale}/{slug}` | `{archive-path}` |
| 4 | `{placeholder-rel}` | `{archive-path}` |

**Longest-match-first is load-bearing, not tidiness:** the absolute form *contains* the root-relative
form, so replacing the short one first corrupts the long one.

The issue lists a separate `{placeholder}/cdn` → `{archive-url}/cdn` mapping; the spike showed it's
**redundant** — rule 2 already yields `{archive-url}/cdn/…` because `cdn/` sits at the archive root.
Harmless to state explicitly, but it isn't a distinct case.

The separate-assets URL is **not** rewritten — see D4.

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

Note the first-upload path makes `createGraphic` the run's first server call, so any token prompt lands
there rather than at Phase 4. That's fine either way (D6).

**D5 — SRI moves to the staged copy, after rewrite.** Today `addSRI` mutates files **in `dist/`** before
copying (`src/pack/edition/types/interactive.ts:129-139`), which cannot be per-archive-correct once each
archive's copy has different bytes. It must run on `<staging>/<archive-id>/interactive/**` after the
rewrite and before `zipDir`. Its "resource under canonical path" branch (`src/utils/sri.ts:162-169`)
resolves cleanly post-hoist, so this gets *simpler*. Also: stop swallowing its errors silently, or at
least never route the zero-residual assertion through that swallow.

**D6 — Token handling is out of scope. Leave it exactly as it is.**

No warm-up step, no pre-flight token call, no change to caching. If a server call needs a token and no
valid one exists, prompting for one *at that point* is acceptable — whether that lands before, during or
after the interactive phase.

Context so a reader doesn't mistake this for an oversight: the paste prompt
(`src/server/token.ts:92-120`) is a *fallback*, not the normal path. `getToken()` POSTs credentials
(`:24-48`) and only prompts on a 401 or when the JWT lacks `GFX_` rights (`:152-168`), so users with
adequate credentials never see it. Our 15-minute cache covers **only** the pasted token (`:50-66`,
written at `:117`), and `server-client` calls `_getToken()` per request
(`node_modules/@reuters-graphics/server-client/dist/index.js:1270` et al), so for the
lacks-`GFX_`-rights cohort a long upload can prompt more than once. Accepted.

What Phase 0 does keep is the *non-interactive* credentials check: `getServerCredentials()`
(`src/server/credentials.ts:37-61`) throws `UserConfigError`/`ServerCredentialsError` on missing or
malformed credentials without touching the network, so that class of failure still surfaces before the
build.

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

Consequence, narrowed by the M0 spike: because we copy the whole `cdn/`, a media archive contains the
full client route manifest *and every route node chunk* — the spike found `"/embeds/en/page"` in
`entry/app.*.js` and all six `nodes/*.js` present inside a `media-en-map` archive. So a **client-side**
navigation to a sibling route renders fine; SvelteKit doesn't need the sibling's HTML for an SPA
transition. Only a **hard load** of `{archive-url}/embeds/en/page` 404s.

**But we don't want authors relying on that.** The stated expectation is that an embed is a single page:
no internal routing, no links to other pages in the project. That it happens to work via client-side
routing is an accident of bundling the whole `cdn/`, not a supported feature — the HTML for those pages
isn't in the archive, so any hard load, refresh or shared link breaks. M6 documents this as an explicit
assumption rather than leaving authors to discover the edges.

Consequence for the code: assembly stays two paths (public = whole build, media = page + `cdn/`), so
`Interactive.packUp` keeps its `archive.type` branch rather than becoming uniform.

---

## Milestones

Each is a PR. M1–M5 are sequential; M6 rides along with whichever milestone changes the surface it
documents. M7 is the acceptance gate for the whole issue.

### M0 — Spike: assemble and rewrite one archive locally ✅ done

Ran against a real graphics-kit build (`test-url-rewrite-scratch`, built with
`homepage: "https://www.reuters.com/graphics/__GKP_BASE__/"`). Hand-assembled the `media-en-map`
archive — map page hoisted to the archive root, whole `cdn/` copied — rewrote it to a stand-in archive
URL, then served it over HTTP and audited every reference. Script kept at
`/private/tmp/gkp-m0-spike/spike.mjs` as the seed for M1's implementation and fixtures.

What it established:

| Question | Answer |
|---|---|
| Is the sentinel ever split or encoded in real output? | No — 94 full-token matches, 94 bare `GKP`, zero percent-encoded or escaped variants |
| Which forms occur? | Absolute (85) and root-relative (94 incl. the absolutes), i.e. **9 root-relative-only** — rewriting only the absolute form would miss them |
| Does one ordered pass replace everything? | Yes — 27 occurrences in this archive, **zero residuals**, no `sveltekit-prerender` host |
| Do all references resolve inside the archive? | Yes — 17/17. The only non-200 was `{archive}/cdn` with no path, which appears solely as SvelteKit's `assets:` base constant and is never fetched |
| Are sibling route chunks present? | Yes, all of them — see D8 |

Two plan corrections came out of it: the `{placeholder}/cdn` mapping is **redundant** (rewriting the bare
base already yields `{archive}/cdn/…` because `cdn/` sits at the archive root), and D8's cost is narrower
than first written.

**Deliberately not proven here:** that Sphinx serves the structure. No scratch packs were created. That
question moves to M7 — a considered leap of faith, backed by the local validation above.

### M1 — The rewrite module (`src/rewrite/`)

Pure, dependency-light, heavily tested. No flow changes; nothing calls it yet.

- `rewriteDir(dir, mappings)` — longest-match-first replacement across all text files (HTML/JS/CSS/JSON/
  `.map`; downstream ships `build.sourcemap: true`, `bluprint_graphics-kit/vite.config.ts:28`).
  Binary files untouched.
- `assertNoResidualPlaceholder(dir)` — fails loudly with file:line list. Also assert no
  `sveltekit-prerender` host (issue's belt-and-suspenders).
- Percent-encoded forms: the spike found **none** in real output, so don't build for them speculatively —
  let `assertNoResidualPlaceholder` catch them if they ever appear (issue Risk #3).
- **Tests** use the temp-project harness from #164 (`src/__test__/project.ts`): real files, real dirs.
  Seed fixtures from the shapes the spike observed — absolute in `href`/`src`, root-relative in
  `base: "…"`, the `assets:` base constant, and sourcemaps.
- **Exit:** `pnpm test` green on 20/22/24; module unused in production paths. Re-running the spike's
  audit against `rewriteDir` output reproduces its result: zero residuals, every reference resolving.

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
- **Exit:** one build instead of two; with the sentinel env var set, the built output contains the
  placeholder in both its absolute and root-relative forms and nothing else changes — `Finder` discovers
  the same archives and editions as before, and `preview` output is byte-identical to `main`'s. Verified
  in `test-url-rewrite-scratch` via a `pkg.pr.new` build, not against Sphinx.

  **This can only be verified with the new library installed in the app.** `getBasePath` is called from
  the app's own `svelte.config.js`/`vite.config.ts`, so the placeholder only appears if *that* copy of the
  publisher implements it. Confirmed the hard way: building the scratch project with the env var set but
  the published 3.4.7 installed baked the real `homepage` in all 94 places and no placeholder at all.

- **Trap this exposes, to handle in M4: an *absent* placeholder is as broken as a residual one, and
  quieter.** If the build didn't pick up the sentinel — version skew between the CLI and the installed
  library, or an app computing its own base — the output contains real URLs, `assertNoResidualTokens`
  finds nothing to complain about, and every archive silently ships pointing at the public URL, i.e.
  today's hub-and-spoke with none of the safety. So M4 must also assert the rewrite *did* something:
  `rewriteDir` returns per-mapping counts, so fail when `report.total === 0` for an archive whose page
  should reference the base.

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
- Add Phase 0 preflight (credentials shape-check + `ensurePackId`) and Phase 3(d) validation (D7). Token
  handling is untouched (D6).
- Add the Phase 3(e) summary: archives, and which are new vs. updates. **No confirm prompt in M3** —
  M5's selection multiselect *is* the decision point, so adding a confirm here would be friction we'd
  immediately take back out. Today's `upload` has no gate either, so this changes nothing for anyone.
- Fix `edition.*` pointer resolution while we're here: `index.html?title` currently resolves against
  `process.cwd()`, not the edition root (`src/pack/archive/metadata.ts:22`, `:38` → `utils.fs.get`),
  contradicting `llms/pack-metadata.md:240`. Front-loading makes the wrong behaviour more visible.
- **Exit:** a returning user with a new embed sees *all* prompts before any upload starts; CI path
  unchanged; `git status` clean after tests.

### M4 — Self-contained assembly

- `Interactive.packUp` (`src/pack/edition/types/interactive.ts:123-147`): for media archives, also copy
  `dist/cdn/**` into `interactive/cdn/`. Then, per archive: rewrite (M1) → **assert the rewrite replaced
  something** (see M2's trap — a zero-replacement archive means the build never saw the placeholder) →
  assert zero residuals → SRI on the staged copy (D5) → preview image → manifest → zip.
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
- **Exit:** the assembled archive is byte-inspectable and contains its own `cdn/`; zero residual
  placeholders; the M0 audit re-run against library-produced output gives the same result (all references
  resolve inside the archive). Server-side confirmation waits for M7.

### M5 — Selection

**The prompt.** clack's `groupMultiselect` (available in the installed 1.7.0), grouped so the publishing
consequence of each option is legible, and so all embeds can be taken or dropped in one keystroke —
`selectableGroups` defaults to `true`, which is the reason for choosing this prompt over a flat
`multiselect`:

```
◆  Which archives do you want to upload?
│  ◻ reuters.com
│  │  ◻ public                        updates existing
│  ◻ embeds
│  │  ◻ en-map                        updates existing
│  │  ◻ en-page                       new
│  │  ◻ en-israel-leban…-strikes-map  new
```

- **Groups** — `reuters.com` holds the `public` archive; `embeds` holds the media archives.
- **Labels are display-only.** `public` stays as-is; media archives drop the `media-` prefix
  (`media-en-map` → `en-map`), since it's on every one of them and carries no information.
- **Truncate long labels in the middle, not the end.** Cap at 30 characters with a `…`. Tail truncation
  is precisely the wrong cut here: sibling embeds routinely share a long prefix and differ in the final
  token (`…-strikes-map` vs `…-strikes-chart`), so cutting the end can render two options identical.
  Middle truncation keeps both the locale and the distinguishing tail.
- **Hint carries status, not the full slug** — `new` or `updates existing`, from
  `PKG.archive(id).uploaded`. `finder.logFound()` (`src/finder/index.ts:22-31`) has just printed every
  full archive id immediately above the prompt, so repeating it there wastes the line; status is the
  thing the user can't otherwise see.
- **`initialValues`: everything.** Pressing enter reproduces today's upload-all behaviour.
- Wrapper at `src/prompts/groupMultiselect.ts`, mirroring `src/prompts/multiselect.ts` — thin, and
  handling `isCancel` → `cancel('Cancelled')` → `process.exit(0)`.

**The flag.** `--archives <slugs>` on `upload` (`src/cli.ts:84-88`, threaded through `src/index.ts:32-37`
→ `Pack.upload()`) takes **canonical** archive ids — `public`, `media-en-map` — because those are what
the server, `package.json` and the docs use. Also accept the shortened display form and canonicalise it,
so anything a user reads off the prompt works when scripted. Validate against discovered archives; on an
unknown value, error listing the canonical ids.

**Defaults.** CI (`utils.environment.isCiEnvironment()`) with no flag → upload all, i.e. today's
behaviour. `upload:quick` becomes sugar for `--archives public`; it currently diverges via
`finder.findEditions(publicOnly)` (`src/finder/index.ts:36-44`) and by skipping separate assets, so decide
whether selection replaces the `publicOnly` flag outright.

- **Exit:** selecting one of several archives uploads exactly one; skipped archives are untouched on the
  server; a slug typo fails fast with a useful list.

### M6 — Docs + changeset

`docs/content/docs/page-builders.mdx:105-129` and `llms/page-building.md:61-70` document the two-pass
build explicitly and must be rewritten; `llms/glossary.md:68` defines "Two-pass build" as a term.
Also: `docs/content/docs/sphinx.mdx:78-89` (interactive edition file tree gains `cdn/`),
`docs/content/docs/commands.mdx:26-62` (`upload` / `upload:quick`, plus `--archives` and the selection
prompt), `docs/content/docs/package.mdx`, `docs/content/docs/Config/build.mdx`, and the `getBasePath`
JSDoc at `src/basePaths.ts:48-96` (rendered into API docs). `HOME.md:143-164` states the invariant this
change reverses — update or retire it.

**New doc requirement: state that an embed is a single page.** No internal routing, no links to other
pages in the project. Only the embed's own HTML is hoisted into its archive, so a link to a sibling page
has no HTML to land on. It will *appear* to work in testing because the whole `cdn/` ships with every
archive and SvelteKit routes client-side — but a hard load, refresh or shared link 404s. Say this
positively (an embed is one page) rather than as a list of caveats, and put it where authors are building
embeds: `docs/content/docs/page-builders.mdx` and `docs/content/docs/sphinx.mdx`, plus
`llms/page-building.md` for the agent-facing copy.

Changeset: **minor**. Add it in the final commit so the open patch-release PR (#165) stays independently
mergeable until then.

### M7 — End-to-end confirmation against the real graphics server

The acceptance gate. Deliberately the *only* time this work touches Sphinx: no scratch packs are created
during development, on purpose.

- Install the `pkg.pr.new` preview build of the finished branch into a real graphics-kit project.
- `upload` (exercising selection), then `publish`.
- Confirm on the live server: each embed serves from **its own** archive URL with assets resolving;
  canonical and embed codes correct; re-uploading **one** archive leaves the others working — the
  property the whole issue exists to deliver.
- **Exit:** it serves. If it doesn't, the failure is in how Sphinx handles the structure, and the local
  work stands — D8 (archive contents) and D3 (mappings) are the levers to adjust.

---

## Verification

- **Unit** — the #164 harness gives every test file a real temp project, which suits this work: rewrite
  fixtures, staged-archive assembly and zip contents are all real-filesystem assertions. Run on
  20/22/24 (`/usr/local/n/versions/node/{20.20.2,22.22.3,24.16.0}`).
- **Downstream** — `pkg.pr.new.yaml` triggers on bare `on: push`, so *any* branch push publishes an
  installable preview. Test each milestone in a real graphics-kit project before opening the PR.
- **Server** — none during development. No scratch packs; the real server is touched once, at M7.
- **Local stand-in for serving** — the M0 audit: serve the assembled archive over plain HTTP at a path
  mirroring an archive URL, then check every reference in it resolves. Repeatable against
  library-produced output at M4.
- **Invariants to assert in CI** — zero residual placeholder tokens; each media archive contains
  `interactive/cdn/`; `git status` clean after the suite.

---

## Risks

1. **Serving from its own URL is unproven until M7.** A deliberate leap, narrowed by M0: we know the
   rewrite is complete and that every reference resolves within the archive on a plain static server.
   What's untested is Sphinx's own handling — its post-processing, index resolution and path serving.
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
