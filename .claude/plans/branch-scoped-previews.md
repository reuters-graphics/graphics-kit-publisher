# Branch-scoped previews

Task plan. Goal: `graphics-publisher preview` publishes one preview **per git branch**, so a feature
branch's preview no longer overwrites another branch's.

Baseline: `main` @ fbeac89. Branch: `feat/branch-scoped-previews`.

---

## Goals

1. **One preview per branch.** Keep today's per-project S3 root, add one path segment: a slugified
   current git branch name.
2. **`package.json` records every branch's URL.** `reuters.preview` grows from a string to
   `{ root, branches }` — an S3 key prefix, plus a map of branch slug → full preview URL.
3. **Restore cleanup on publish, root-wide.** Delete the whole project preview root (every branch), not
   just the current branch's subpath.
4. **Nothing changes inside the project's build.** The URL is still resolved and persisted to
   `package.json` before the build spawns — the channel that already exists — and page builders keep calling
   `getBasePath('preview')` unchanged.

Non-goals: a generated index page listing a project's branch previews; per-branch cleanup commands (root-prefix
deletion already covers the CI case — see Running in CI); S3 lifecycle/expiry rules;
touching `homepage`/production URLs; changing preview _images_ (see A1).

---

## Today's flow, and what's actually there

| Concern             | Where                                                              | Current behaviour                                                                                                                       |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| URL mint/read       | [previewURL/index.ts:8-18](../../src/preview/previewURL/index.ts)  | Reads `PKG.preview`; if unset, mints `{ORIGIN}/testfiles/{year}/{12-char hash}/`, writes it back, returns it                            |
| Upload              | [preview/index.ts:13-37](../../src/preview/index.ts)               | `getPreviewURL()` → `buildForPreview()` → strips `ORIGIN + '/'` to a bucket path → `s3.uploadLocalDirectory(outDir, path)` → log → open |
| Base path for build | [basePaths.ts:45-46](../../src/basePaths.ts)                       | `case 'preview': return PKG.preview!`                                                                                                   |
| Storage             | [pkg/index.ts:122-127](../../src/pkg/index.ts), `dotPaths.preview` | `reuters.preview`, typed `string` at [pkg/types.ts:15](../../src/pkg/types.ts)                                                          |
| Cleanup on publish  | —                                                                  | **Does not exist.**                                                                                                                     |

### Cleanup on publish was real, and the v3 rewrite dropped it

Worth stating plainly because the task description hedged on it ("_I think_ on publish we delete the
preview links"). It did exist — commit `998f957` added it to the v2 `src/publish/index.ts`:

```js
const { preview } = pkg.reuters;
if (preview) {
  const s3Client = new S3Client();
  const bucketPath = preview.replace(PREVIEW_ORIGIN, '');
  console.log('🧹Cleaning up preview link ...');
  await s3Client.dangerouslyDeleteS3Directory(bucketPath, true);
}
```

Commit `d620629` ("lots") deleted `src/publish/index.ts` in the v3 rewrite and the cleanup never
reappeared in `Pack.publish()`. So this plan **restores** it rather than adding it — and fixes a latent
bug in the original while doing so: `replace(PREVIEW_ORIGIN, '')` leaves a leading `/`, yielding
`/testfiles/…`. (Harmless only because graphics-bin strips a leading slash before `ListObjectsV2` — but
_after_ the depth check, which counts the empty leading segment and so over-counts depth by one. The
current upload path already does this correctly with `replace(PREVIEW_ORIGIN + '/', '')`.)

### Constraints `dangerouslyDeleteS3Directory` imposes

From graphics-bin's implementation, all of which the design has to respect:

- **No-op in CI** (`isCiEnvironment() && !isTestingEnvironment()` returns early). Preview cleanup will
  therefore never run in CI. Acceptable — but it must not be reported as if it had.
- **Depth ≥ 3 required**, counted as `path.split('/').length - 1`. Our root `testfiles/{year}/{hash}/`
  is exactly 3 → passes. A branch subpath is 4 → also passes. No headroom below the root, which is
  another reason root-wide deletion is the right granularity.
- **Returns the object list without deleting** under `isTestingEnvironment()` — so this is testable the
  same way `uploadPreview` already is.
- Prompts for confirmation unless `force: true`.

### The S3 upload cache: safe on upload, a trap on delete

`S3UploadCache.generateCacheKey` hashes `` `${filePath}|${s3Path}` ``, so per-branch bucket paths get
distinct keys — switching branches correctly re-uploads everything. **But** the cache (at
`node_modules/.cache/graphics-bin/s3.json`) survives the root deletion on publish. Left alone, the next
`preview` run after a publish would skip uploading files it believes are already in S3, and publish a
partial preview. Cleanup must call `s3.clearCache()` after deleting. This is a pre-existing hazard the
v2 code also had; it just never fired because previews were rarely re-run post-publish.

---

## Target shape

```
https://graphics.thomsonreuters.com/testfiles/2026/ab12cd34ef56/feat-new-chart/
└──────────── PREVIEW_ORIGIN ──────┘└──── root (stored) ───┘└─ branch slug ─┘
                                    └─ key prefix, no origin ┘
                                    the whole line is a `branches` value
```

```json
{
  "reuters": {
    "preview": {
      "root": "testfiles/2026/ab12cd34ef56/",
      "branches": {
        "main": "https://graphics.thomsonreuters.com/testfiles/2026/ab12cd34ef56/main/",
        "feat-new-chart": "https://graphics.thomsonreuters.com/testfiles/2026/ab12cd34ef56/feat-new-chart/"
      }
    }
  }
}
```

Two deliberate asymmetries, both in D2:

- `root` is an **S3 key prefix, not a URL** — no scheme, no host. It isn't a page anyone should click, and
  after a publish it names an empty prefix, so it must not look like a live link. Branch values stay fully
  specified URLs, because those _are_ live pages people paste to each other.
- `root` **survives publish**; cleanup empties `branches` but leaves `root` in place to mint from next time.

---

## Decisions

**D1 — No new env var. `package.json` is already the channel; `getBasePath` just needs the branch.**

Worth being precise, because it's easy to assume the preview URL is _passed_ to the build. It isn't, and
never was. `buildForPreview` spawns with **no `env` at all**; the sequence is:

```
uploadPreview()
  getPreviewURL()      → writes reuters.preview to package.json (synchronously)
  buildForPreview()    → spawns the build
    └─ project's config calls getBasePath('preview')
         → reads reuters.preview back off disk
```

That write-then-read _is_ the upstream resolution, and it keeps working. All the branch map changes is
_which entry_ to read — so the only new requirement is that `getBasePath` knows the current branch:

Resolution order in `getBasePathByMode`:

1. `PUBLISHER_PLACEHOLDER_BASE` — unchanged, still wins over everything (a rewrite-bound build must never
   see a real URL).
2. `PKG.preview.branch(currentBranchSlug()).url` — reads the recorded `branches` entry, not `root + slug`, so a
   branch that has never been previewed resolves to nothing rather than to a URL with no files behind it.
3. `''` — see D5.

Step 2 means `basePaths.ts` gains a git call. It's `execFileSync`, sub-10ms, wrapped in try/catch, and
memoised per process; a build config is already doing far more expensive work. This is **mandatory**, not a
convenience: a developer running `pnpm build:preview` directly has no publisher to tell them anything, and
the docs promise that path keeps working.

**Why not reuse `PUBLISHER_PLACEHOLDER_BASE`.** It doesn't mean "here is your base URL" — it means "this
build will be rewritten per-archive afterwards, so hand out a sentinel," and its value _is_ the sentinel
`https://www.reuters.com/graphics/__GKP_BASE__/`. Preview never rewrites: `src/rewrite/` is imported only by
[pack/archive/index.ts:17](../../src/pack/archive/index.ts), and `uploadPreview` goes straight from build to
`uploadLocalDirectory`. Set the placeholder for a preview build and `__GKP_BASE__` is baked into the output
with **nothing to ever replace it**. The existing invariant test at
[basePaths.test.ts:176](../../src/basePaths.test.ts) — "overrides every mode, since the publisher knows what
it is building" — exists to keep real URLs out of rewrite-bound builds, and reusing the var here would
invert it.

**Why no _new_ env var either.** An earlier draft of this plan added `PUBLISHER_PREVIEW_BASE`, mirroring the
placeholder pattern. Dropped: since step 2 has to exist anyway, the var would be redundant. Parent and child
share cwd and inherited environment and run the same resolver, so they resolve the same branch. Its only
real benefit was making the path the publisher _actually uploaded to_ authoritative instead of re-derived —
which matters solely if a build script `cd`s elsewhere (a monorepo wrapper), and such a script would read a
different `package.json` too, so today's code is equally exposed. Not worth a permanent public env var and an
extra branch in `getBasePath`. If that case ever shows up for real, adding it later is a two-line change.

**D2 — Store the root explicitly, as an S3 key prefix, and keep it across publishes.**

`preview: { root, branches: {…} }` rather than a flat slug→URL map, with `root` holding
`testfiles/2026/hash/` — no origin. That buys four things:

1. **The root is the single source of truth.** A branch URL is always composed as
   `PREVIEW_ORIGIN + '/' + root + slug + '/'`, never parsed back out of a sibling entry. Nothing to keep in
   sync, and a hand-edited branch entry can't silently redefine where new previews go.
2. **The deletion target is unambiguous** — one field, rather than "derive it from whichever entry we
   happen to read first."
3. **Cleanup empties `branches` but preserves `root`** (D6), so a published project still knows where its
   previews live. This closes the divergence window that mattered — see D2a.
4. **A key prefix is the form the code actually wants, and reads as not-a-link.** Every internal consumer
   needs the key: `uploadLocalDirectory` and `dangerouslyDeleteS3Directory` both take one, and
   `uploadPreview` currently round-trips a URL back to a key via
   `replace(PREVIEW_ORIGIN + '/', '')` ([preview/index.ts:18](../../src/preview/index.ts)) — a step that
   disappears. Only `getBasePath` and the human-facing log want a URL, and both read `branches`.
   Consequences: `PREVIEW_ORIGIN` stops being baked into persisted state and lives in exactly one place; the
   depth-3 constraint becomes directly inspectable (three visible segments); and after a publish the field
   names an **empty** prefix, so it had better not look like a page worth clicking.

The year and hash are therefore pinned for the life of the project: minting happens once, ever. A project
that started in 2025 keeps a 2025 root even when a branch is previewed in 2027.

```
2026, branch A: no root  → mint  testfiles/2026/hash1/ → A = {ORIGIN}/testfiles/2026/hash1/a/
2027, branch B: has root → reuse testfiles/2026/hash1/ → B = {ORIGIN}/testfiles/2026/hash1/b/
publish        : delete testfiles/2026/hash1/, branches = {}, root kept
2027, branch C: has root → reuse testfiles/2026/hash1/ → C = {ORIGIN}/testfiles/2026/hash1/c/
```

Three consequences worth accepting deliberately:

- **The two fields are in different forms**, so anyone reading `package.json` who concatenates `root` with a
  slug gets a path, not a URL. Accepted as the point rather than a flaw — but it's why the docs (M7) show
  both fields together, and why the type makes the distinction explicit.

- **The year segment stops tracking activity.** A long-lived project (a tracker maintained across years)
  keeps all its previews under its founding year. If that segment exists for S3 housekeeping, this makes it
  a creation date rather than a last-touched date. Judged the better trade: stability beats tidy buckets,
  and re-minting per year would reopen D2a every January.
- **Preview URLs are now reusable.** Publish deletes `…/hash1/feat-x/`; if a later branch slugifies to
  `feat-x` again, that URL comes back with unrelated content. Someone holding a months-old link sees a live
  page rather than a 404. Low impact, but it's a property the previous design didn't have.

**D2a — Divergence is now confined to a project's first-ever preview.**

Roots diverge when two branches both mint independently, because `cryptoRandomString` gives them different
hashes. Under the flat-map design that could happen **after every publish**, since publish emptied the map
and left nothing to inherit — and post-publish parallel work (corrections, updates) is common. Persisting
`root` closes that window entirely:

```
flat map, root derived:              root stored, kept across publish:
  publish → map empty                  publish → branches empty, root kept
  dev A previews → hash1               dev A previews → reuses root  ✓
  dev B previews → hash2  ✗ diverged   dev B previews → reuses root  ✓
```

What remains is the **first-ever** preview on a project where no `root` has been committed yet: two
branches, neither merged, both mint. Narrow (one moment in a project's life, usually one dev on main) and
now a single-line conflict on `reuters.preview.root` rather than two entries buried under different roots
in a map. That's small enough that seeding the hash deterministically isn't worth its costs — see the
Settled table for why that option was dropped.

Cleanup (M5) still defends against multiple roots: it deletes `root` **plus** any distinct root implied by a
`branches` entry that doesn't sit under it. Since `root` is a key and branch values are URLs, that
comparison strips the origin from each entry before comparing — one `replace` per entry, and the same
derivation legacy migration uses (D7).

**D3 — Slugify by pre-replacing separators, then `slugify` strict.**

`slugify` is already a dependency ([pack/metadata.ts](../../src/pack/metadata.ts),
[finder/index.ts](../../src/finder/index.ts)). But `slugify('feature/new-chart', { strict: true })`
_removes_ the slash → `featurenew-chart`, which both reads badly and collides more (`feat/ure` and
`featu/re` become the same slug). So: replace `[/\\_\s]+` with `-` first, then
`slugify(…, { lower: true, strict: true })`, then collapse and trim dashes, then cap length (60 chars).
`feature/new-chart` → `feature-new-chart`.

Residual collision: `feat/x` and `feat-x` map to the same slug. Accepted — flagging it in the plan rather
than hashing the slug, because a readable URL is the point of this feature.

**Two properties D4 depends on, so they're invariants rather than incidental behaviour:**

- **A slug can never begin with `_`.** The first replacement turns `_` into `-`, and trimming removes leading
  dashes. That's what makes D4's `_` sentinel collision-proof by construction rather than merely unlikely —
  a branch named `_` slugifies to the empty string, and one named `_x` slugifies to `x`.
- **A slug can be empty**, from a name that is entirely separators or non-Latin characters (`___`, `...`,
  `🎉`). An empty slug would build `…/{hash}//`, so it routes to D4's fallback exactly like an unresolvable
  branch. Both invariants get direct tests in M1.

**D4 — Branch resolution order, and what happens when it fails.**

```
PUBLISHER_PREVIEW_BRANCH   (explicit override — CI, or a dev who wants a fixed slug)
GITHUB_HEAD_REF            (GH Actions PR builds: the source branch, not the merge ref)
GITHUB_REF_NAME            (GH Actions push builds)
git rev-parse --abbrev-ref HEAD
```

`git rev-parse` returns the literal string `HEAD` on a detached checkout — that counts as _unresolved_,
not as a branch named "HEAD". Same for a non-git directory, a git failure, and a branch name that slugifies
to nothing (D3).

**When resolution fails, fall back to the slug `_`** and warn. Decided: the command always works rather than
blocking on a git state the user may not have chosen.

**Why `_`.** It cannot collide with a real branch — D3 guarantees no slug ever begins with an underscore, so
this is structural, not a bet on nobody naming a branch `local` (which was the earlier draft's choice, and is
an entirely ordinary branch name). The cost is that `_` is opaque on sight: a bare `.../{hash}/_/` in a URL,
or a `"_"` key in `package.json`, explains nothing by itself. That's carried by two things — the warning at
the moment it happens, and the docs (M7):

```
⚠ Couldn't determine the git branch — publishing to the shared "_" preview.
  .../testfiles/2026/ab12cd/_/
  Anyone else without a resolvable branch publishes here too and will overwrite it.
  Set PUBLISHER_PREVIEW_BRANCH=<name> to get your own preview path.
```

The warning has to state the sharing outright, because that's the one real downside of not erroring here.

`_` is a single constant (`FALLBACK_BRANCH_SLUG` in `src/constants/preview.ts`), and D3's leading-underscore
invariant means any `_`-prefixed value stays collision-proof if we ever want something more descriptive.

**D5 — When the current branch has no entry, `getBasePath('preview')` returns `''`; it never writes.**

Minting is `uploadPreview`'s job. `getBasePath` is called from build configs and must stay read-only —
having a config file mutate `package.json` as a side effect of being loaded would be a genuinely nasty
surprise, and in a publisher-driven run it would race the publisher's own write.

`''` rather than a throw, for consistency with `prod`, which already returns `''` when `homepage` is
unset ([basePaths.ts:47-48](../../src/basePaths.ts)). It's also what today's code effectively does: with
`preview` unset, `PKG.preview!` is `undefined`, and the default options path funnels it through
`getRootRelativePath`'s `if (!urlPath) return ''`. (With `rootRelative: false` it currently throws a
`TypeError` in `removeTrailingSlash` — so this also fixes a latent crash.)

**D6 — Publish deletes the root's contents and clears `branches`, keeping `root`.**

Per the task: delete _all_ previews. S3 and `package.json` must stay in step — deleting objects while
leaving URLs behind would leave every entry pointing at a 404, and those URLs are what people paste into
Slack. Sequence: delete each root's contents → `s3.clearCache()` (see the cache note above) →
`PKG.preview.clearBranches()`.

`root` is already the key `dangerouslyDeleteS3Directory` wants (D2), so cleanup passes it straight through —
no origin stripping, and no chance of reintroducing the leading-slash bug the v2 code had.

`root` is deliberately **not** cleared (D2). It's a pointer, not a record of live files: keeping it means
the next preview reuses the same prefix instead of minting a new one, which is what closes D2a's
post-publish divergence window.

**Cleanup is gated on `root` existing — never on `branches` being non-empty.** This looks like a pointless
distinction and isn't. `dangerouslyDeleteS3Directory` finds what to delete by listing S3
(`paginateListObjectsV2` with `Prefix`), so it removes **whatever is actually under the root**, not what
`package.json` records. That's what makes previews published from CI recoverable: a CI run writes its branch
entry to a runner-local `package.json` that's then discarded (see the CI section below), so `branches` in the
repo never learns about it — but the objects still sit under the root, and a later local `publish` sweeps
them. Gate on `branches` instead and that whole class of preview becomes undeletable, because the run that
could delete them would return early believing there was nothing to do.

The cost of gating on `root` is one `ListObjectsV2` against an empty prefix when someone publishes twice with
no preview in between. That call returns zero objects and exits. Cheap enough that it isn't worth an
optimisation that breaks CI cleanup — and worth a comment saying so, because "return early if there are no
recorded branches" is exactly the tidy-up someone will later propose.

Placement: after the pack is successfully published, in both the CI and interactive paths of
[pack/index.ts:318-439](../../src/pack/index.ts) — one private helper called next to each
`setPublishTimes()`. It self-neuters in CI (D-constraint above), so the CI path stays a no-op in
practice, but calling it in both places means the invariant is "published ⇒ previews cleaned" rather
than "published interactively ⇒ previews cleaned."

Failure must not fail the command: the pack _is_ published by then, and a publish that reports failure
after succeeding is worse than an orphaned preview. Wrap in try/catch, warn, continue.

**D7 — A legacy `reuters.preview` string is rewritten into `{ root: <its key>, branches: {} }`.**

The explicit-root shape makes this a clean one-time rewrite rather than a normaliser that has to
reinterpret a string differently for different accessors. The legacy value is a full URL, so migration
strips it to a key: **`new URL(legacy).pathname.replace(/^\//, '')`**, not
`replace(PREVIEW_ORIGIN + '/', '')`. The generic form matters — a legacy value with an unexpected origin
would survive a non-matching `replace` intact and then get re-composed into
`https://graphics.thomsonreuters.com/https://…`. Parsing the pathname can't produce that, and an
unparseable value is caught and re-minted rather than stored.

The hash and year carry over, so a project's preview identity is continuous across the migration, and no S3
objects are deleted by a `preview` run.

The accepted cost: files already sitting at the root stay there. Anyone holding a pre-migration link sees
a **stale build** rather than a 404, until `publish` deletes the root. Rejected the alternative of
deleting those objects during migration — a `preview` command that silently deletes from S3 is a worse
surprise than a stale link — and rejected mapping the default branch to the root itself, which would have
made the root undeletable independently of `main`'s preview.

Migration is therefore write-on-first-use: it happens when `uploadPreview` next mints an entry, not on
read.

**D8 — `restart` and `delete` keep their current behaviour: they don't touch previews.**

`resetPackData` clears `homepage`, pack ID, archive URLs — all _server_-issued values. Preview URLs are
ours and the S3 objects still exist, so clearing them would strand files with no record of where they
are. Out of scope, but called out because it's the obvious next question.

**D9 — In CI, refuse to mint a `root`. Fail with instructions instead.**

Minting is fine locally: the new `root` is written to `package.json` and the developer commits it. In CI the
write is discarded with the runner, so a minted root is **untrackable** — nothing in the repo records it, so
no later `publish` can sweep it (a prefix delete needs to know the prefix), and it orphans permanently.

So `getPreviewURL` throws a `PackageConfigError` when `PKG.preview.root` is absent **and**
`utils.environment.isCiEnvironment()`:

```
✗ No preview root in package.json.

  Previews need a root recorded in `reuters.preview.root`. In CI the publisher
  can't create one — the change wouldn't be committed, so the preview could
  never be cleaned up.

  Run `preview` once locally and commit `reuters.preview.root`, then re-run.
```

The cost is that a project's first-ever CI preview fails until someone runs one locally. Accepted: that's a
one-time, self-explaining failure, versus a silent permanent orphan on every run. It's also the only case in
the whole design that produces genuinely unrecoverable state, which is why it gets a hard stop rather than a
warning.

---

## Running in CI

The motivating case: a GitHub Action that publishes a preview when a PR is opened.

### The branch resolves — because of D4's ordering, not by luck

On a `pull_request` event two of the three sources are wrong, so the order is load-bearing:

| Source                            | `pull_request`                                                   | `push`              |
| --------------------------------- | ---------------------------------------------------------------- | ------------------- |
| `GITHUB_HEAD_REF`                 | `feat/new-chart` ✅                                              | unset               |
| `GITHUB_REF_NAME`                 | `123/merge` ❌                                                   | `feat/new-chart` ✅ |
| `git rev-parse --abbrev-ref HEAD` | `HEAD` — `actions/checkout` checks out the merge ref detached ❌ | branch ✅           |

A PR preview lands on `feat-new-chart` only because `GITHUB_HEAD_REF` is consulted first. Reorder those
checks and PR previews silently go to `123-merge` — plausible-looking, meaningless, and different per PR. That
rationale belongs in a comment next to the list, not just here.

### Cleanup: previews accumulate until someone publishes locally

Two independent facts combine, and the combination is benign:

- The S3 delete is a **hard no-op in CI** — graphics-bin returns early on
  `isCiEnvironment()`, which is `GITHUB_ACTIONS || VERCEL || CI`. So a CI `publish` never cleans up.
- CI's `package.json` write is **ephemeral** — the branch entry lives on the runner and is discarded.

Neither loses the previews, because deletion is driven by an S3 **prefix listing**, not by the `branches`
record (D6). CI previews sit under the committed `root`, so the next `publish` run **locally** sweeps every
one of them, recorded or not. Accumulation is bounded by "until the next local publish," not permanent.

This is exactly why D6 gates cleanup on `root` rather than on `branches` being non-empty — under the other
gating, a local publish would return early and CI previews would be undeletable.

The one genuinely unrecoverable case is a CI run minting its own ephemeral `root`, which no later publish
could ever find. D9 makes that a hard failure rather than a silent orphan.

### Wiring one up

- Commit `reuters.preview.root` first — run `preview` locally once (D9 fails otherwise).
- Nothing else to configure: `GITHUB_HEAD_REF` is set automatically, and `PUBLISHER_PREVIEW_BRANCH` is
  available if a workflow wants to pin the slug explicitly.
- The workflow does **not** need to commit the branch entry back. It's convenient for humans reading
  `package.json`, but cleanup doesn't depend on it.
- Time-based expiry of `testfiles/` (an S3 lifecycle rule) is the natural complement, and would also cover
  orphans predating this change. Out of scope here — worth its own issue.

---

## Milestones

### M1 — Branch resolution (`src/git/branch.ts`)

New module, no dependencies on anything else in `src/`, so both the publisher and `basePaths` can use it
without a cycle.

- `currentBranch(): string | undefined` — D4's order, `execFileSync('git', ['rev-parse', …])` with
  `stdio: ['ignore','pipe','ignore']`, try/catch → `undefined`, `'HEAD'` → `undefined`. Memoised.
- `branchSlug(branch: string): string` — D3. May return `''`.
- `currentBranchSlug(): string` — the composition, returning `FALLBACK_BRANCH_SLUG` when the branch is
  unresolvable **or** slugifies to empty (D4). Returning a plain `string` rather than `string | undefined`
  keeps the fallback in one place instead of at every call site; the warning is emitted by the caller that
  writes, not here, so a `getBasePath` read doesn't print anything.

Tests: slugify table (`main`, `feature/new-chart`, `fix/JIRA-123_thing`, unicode, 80-char name), plus
env-var precedence with `PUBLISHER_PREVIEW_BRANCH` / `GITHUB_HEAD_REF` / `GITHUB_REF_NAME`. The
git-subprocess path is exercised by the harness's real temp project (`git init` in a fixture) rather than
mocked.

Plus the two D3 invariants the `_` sentinel rests on, tested directly rather than assumed:

- **no slug begins with `_`** — over the table above plus `_`, `__x`, `_feature/x`
- **empty slugs route to the sentinel** — `___`, `...`, `🎉` all yield `_` from `currentBranchSlug()`

### M2 — Storage: `reuters.preview` as `{ root, branches }`

- [pkg/types.ts:15](../../src/pkg/types.ts): `preview: string` → the two forms named in the type itself, so
  the key/URL split is documented where it's declared:

  ```ts
  preview: {
    /** S3 key prefix, e.g. `testfiles/2026/ab12cd34ef56/` — not a URL. */
    root: string;
    /** Branch slug → fully specified preview URL. */
    branches: Record<string, string>;
  }
  ```

- [pkg/index.ts:122-127](../../src/pkg/index.ts): `PKG.preview` stops being a string property and becomes a
  **namespace instance**, built in the constructor beside `this.pack = new Pack()`. This mirrors the two
  patterns already in the file — `Pack` for a namespace, `archive(id)` for a keyed factory — so preview reads
  the same way the docs' own canonical example does (`PKG.archive('media-en-page').url`):

  ```ts
  class PreviewBranch {
    constructor(private slug: string) {}
    get url(): string | undefined;
    set url(url: string);
  }

  class Preview {
    /** S3 key prefix. Returns what's stored — no silent URL composition. */
    get root(): string | undefined;
    set root(key: string);
    /** The whole map, `{}` when absent — mirrors `PKG.pack.archives`. */
    get branches(): Record<string, string>;
    /** One entry — mirrors `PKG.archive(id)`. */
    branch(slug: string): PreviewBranch;
    /** Empties `branches`, leaves `root` (D6). */
    clearBranches(): void;
  }
  ```

  Note `branches` (getter, whole map) and `branch(slug)` (factory, one entry) are deliberately the
  singular/plural pair `Pack` already uses for `archives` / `PKG.archive(id)` — not `branches('slug')`.

- [pkg/dotPaths.ts:2](../../src/pkg/dotPaths.ts): `preview` goes from a bare string to an object, matching
  the existing `dotPaths.archives.*` shape:

  ```ts
  preview: {
    root: 'reuters.preview.root',
    branches: 'reuters.preview.branches',
    branch: {
      url: (slug: string) => `reuters.preview.branches.${slug}` as const,
    },
  },
  ```

  `branch.url` resolves to the **leaf** rather than a `.url` sub-key, since a branch entry is a bare URL
  string. A small internal asymmetry against `archives.url(id)`, invisible to callers, and the price of not
  making every entry an object.

**Legacy migration** (D7) is a one-time rewrite, not a read-time normaliser: on first write, if
`reuters.preview` is a `string`, replace it with `{ root: <its pathname, leading slash stripped>, branches: {} }`.
Reads before that point see no `root` and an empty `branches`, so they behave exactly like an unpreviewed
project. No S3 objects are touched.

Note a dot-path hazard: `setPkgProp('reuters.preview.branches.feat-new-chart', …)` relies on graphics-bin's
setter treating the slug as a single key. Slugs contain no dots (D3 strips them), so this holds — M2 gets
an explicit test for a dotted-looking branch name anyway.

### M3 — Minting and upload

- `getPreviewURL()` returns `{ url, bucketPath }` rather than a bare string, since callers need both and
  each is now trivially derived from `root`:
  1. resolve slug (M1), which yields `_` with a warning when unresolved (D4)
  2. `bucketPath = root + slug + '/'`, taking `PKG.preview.root` and minting/persisting
     `testfiles/{year}/{hash}/` only if there isn't one (D2)
  3. `url = PREVIEW_ORIGIN + '/' + bucketPath` — but throw first if there was no `root` and we're in CI (D9)
  4. write `url` to `reuters.preview.branches.{slug}` if it isn't already there, and return both
- `uploadPreview()`: **drops** the `replace(PREVIEW_ORIGIN + '/', '')` at
  [preview/index.ts:18](../../src/preview/index.ts) and uses `bucketPath` directly — the URL→key round-trip
  is what storing a key removes. Calls `buildForPreview()` **unchanged** (D1: the URL travels via
  `package.json`, which `getPreviewURL` has already written), and adds the branch to the log line so it's
  obvious which preview was published.

  The ordering `getPreviewURL()` **then** `buildForPreview()` is load-bearing, not incidental: the write must
  land before the child process reads it. It already holds — `setPkgProp` is synchronous and the existing
  code calls them in that order — but it's the one thing a future refactor could quietly break, so it wants a
  comment.

### M4 — Branch-aware `getBasePath`

The whole milestone is one file. `src/build/index.ts` is **untouched** — no new env var, no signature change,
no spawn `env` block (D1).

- [basePaths.ts:41-51](../../src/basePaths.ts): implement D1's two-step ladder and D5's `''` fallback, using
  M1's resolver.
- Update the long doc comment's `#### preview` section, which currently says the URL comes from
  `"reuters.graphic.preview"` — wrong on **two** counts now (the path is `reuters.preview`, and it's
  `{ root, branches }`). It should say the branch is resolved from git and name
  `PUBLISHER_PREVIEW_BRANCH` as the override, since this is the function downstream configs actually call.
- `src/constants/preview.ts`: add only `FALLBACK_BRANCH_SLUG = '_'` (D4).

### M5 — Cleanup on publish

- `src/preview/cleanup.ts`: `deleteAllPreviews()` — return early only if there's no `root` (D6 — **not** if
  `branches` is empty); otherwise
  collect the keys to delete: `PKG.preview.root` plus any distinct root implied by a `branches` entry that
  doesn't sit under it, each entry stripped to a key the same way D7's migration does (D2a's defence against
  a badly resolved merge or a hand-edited map); `dangerouslyDeleteS3Directory(key, true)` for each — no
  origin stripping, they're already keys; then `s3.clearCache()` **once**; then `PKG.preview.clearBranches()`.
  Returns what it deleted so tests can assert on it.
- Each root is independently depth-3, so the guard holds for all of them. When there's more than one, say so
  in the log — it means the config diverged, and that's worth a user seeing.
- [pack/index.ts](../../src/pack/index.ts): call it beside both `setPublishTimes()` calls (lines 362 and
  437), wrapped per D6.
- Log honestly: in CI the delete is a no-op, so don't print "🧹 Cleaned up previews" unconditionally.

### M6 — Tests

New: `src/git/branch.test.ts`, `src/preview/cleanup.test.ts`, `src/preview/index.test.ts` (there is no
test for `uploadPreview` today — worth adding now that it has branching logic).

Updated:

- `src/preview/previewURL/index.test.ts` — every case currently assumes a string. Add: reuses an existing
  branch entry; mints under an existing `root` for a new branch (asserting the year/hash are _inherited_,
  which is the regression D2 guards); mints and persists a fresh root when there is none; legacy string
  rewritten to `{ root, branches }`.
- `src/basePaths.test.ts` — the fixture at lines 14-20 sets `reuters.preview` to a string. Add a
  branch-lookup test (fixture map + `PUBLISHER_PREVIEW_BRANCH` to pin the branch without needing a git
  fixture), a no-entry-for-this-branch `''` test, and a `rootRelative: false` case — that combination throws
  a `TypeError` today, so it's a latent-crash fix worth pinning (D5). The existing "placeholder overrides
  every mode" test at line 176 must keep passing untouched.
- **The D2a regression test:** publish-cleanup then preview reuses the same root. Empty `branches`, keep
  `root`, mint for two different branches, assert both land under the original root. This is the whole
  reason `root` persists, so it should fail loudly if someone later "simplifies" cleanup to clear it.
- **CI paths**, all cheap because they're env-driven — set `GITHUB_ACTIONS` / `GITHUB_HEAD_REF` and assert:
  a `pull_request`-shaped env resolves the head branch rather than `123/merge` or detached `HEAD`; minting with
  no `root` throws `PackageConfigError` (D9); and cleanup with a `root` but an **empty** `branches` still
  issues the delete (D6's gating — the regression that would silently strand CI previews).
- **The key/URL invariant:** assert `root` never contains `://` and every `branches` value always starts with
  `PREVIEW_ORIGIN`. Cheap, and it's the one mistake this shape invites — a stored URL would silently compose
  into `{ORIGIN}/https://…`. Include a legacy fixture whose origin _isn't_ `PREVIEW_ORIGIN`, since that's the
  case a naive `replace` would pass through intact (D7).

### M7 — Docs

The shape of `reuters.preview` is user-facing, so this is not optional cleanup.

| File                                         | What                                                                                                                                                                                                                                |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/content/docs/package.mdx:14-19,99-106` | JSON example and the `PKG.preview` section → namespace; document `root` / `branches` / `branch(slug).url` / `clearBranches()`, say plainly that `root` is an S3 key prefix rather than a link, and add the v3→v4 before/after table |
| `docs/content/docs/page-builders.mdx:82-102` | "Preview pages" section: branch subpath; **fix `reuters.graphic.preview` → `reuters.preview`** (wrong today)                                                                                                                        |
| `docs/content/docs/commands.mdx:9-11`        | `preview` publishes per branch; `publish` cleans up all previews; **explain the `_` key** — collision-proof but opaque, so docs are where it gets its meaning (D4)                                                                  |
| `llms/page-building.md:56-59`                | Same `reuters.graphic.preview` error; say the branch is resolved from git and that **no** env var is involved for preview — the placeholder-base explanation next to it invites exactly that confusion                              |
| `llms/pack-metadata.md:114`                  | `PKG.preview` is a namespace, not a string; document the new accessors and the v3→v4 migration                                                                                                                                      |
| `llms/index.md:43,51`                        | `preview` is per-branch; `publish` cleans up                                                                                                                                                                                        |
| `llms/glossary.md:74`                        | Preview definition                                                                                                                                                                                                                  |
| `HOME.md:264`                                | Legacy doc; at minimum stop asserting `reuters.preview` is a single URL                                                                                                                                                             |

### M8 — Changeset

**Major** (`4.0.0`). An earlier draft called this minor on the grounds that "no documented API is removed."
That was technically true and substantively misleading: `PKG.preview` changes from returning a URL string to
returning a namespace object, and the string read is exactly what
[package.mdx:104](../../docs/content/docs/package.mdx) documents. Consumers break either way, so the version
should say so — and a major is the better answer to the version-skew risk anyway, since it forces the upgrade
to be a deliberate decision rather than a silent `^` resolution.

Breaking, in the order a reader will hit them:

| Was                               | Now                                | Notes                                                        |
| --------------------------------- | ---------------------------------- | ------------------------------------------------------------ |
| `PKG.preview` → `string`          | `PKG.preview.branch(slug).url`     | `PKG.preview` is now a namespace, not a value                |
| `PKG.preview = url`               | `PKG.preview.branch(slug).url = …` | The old setter is **removed**; docs already discouraged it   |
| `PKG.dotPaths.preview` → `string` | `PKG.dotPaths.preview.root` etc.   | Now an object, matching `dotPaths.archives`                  |
| `reuters.preview` → `string`      | `{ root, branches }`               | Data shape; migrated automatically on the next `preview` run |

```md
major

Previews are now published per git branch, so a feature branch no longer
overwrites another branch's preview.

BREAKING — `reuters.preview` in package.json is now `{ root, branches }` rather
than a single URL string. `root` is an S3 key prefix, not a link; the clickable
URLs are the `branches` values. Existing projects migrate automatically on their
next `preview` run.

BREAKING — `PKG.preview` is now a namespace rather than a string, matching
`PKG.pack` and `PKG.archive(id)`:

    PKG.preview                     ->  PKG.preview.branch('main').url
    PKG.preview = url               ->  PKG.preview.branch('main').url = url
    PKG.dotPaths.preview            ->  PKG.dotPaths.preview.root

`getBasePath('preview')` is unchanged — it still returns a string, and page
builders need no changes.
```

That last line matters: `getBasePath` is what almost every project actually calls, and it keeps working. The
break is confined to the minority reading `PKG.preview` directly.

---

## Verification

1. `pnpm test` — with CI env vars set, per house practice for matching CI.
2. `pnpm knip` — the new `PKG` accessors are exported API; confirm nothing lands unused.
3. `pnpm lint`, `pnpm format`, `pnpm lint:package`.
4. Manual, in a real graphics project, since S3 and git are both real dependencies here:
   - `preview` on `main` → uploads to `…/{hash}/main/`, opens it
   - `git switch -c test/branch-previews`, `preview` → uploads to `…/{hash}/test-branch-previews/`,
     **`main`'s preview still resolves**, `package.json` holds both
   - `preview` again on the same branch → same URL, no new entry
   - detached HEAD (`git checkout --detach`) → warns, publishes to `…/{hash}/_/`
   - a branch named `🎉` → warns, publishes to `…/{hash}/_/` (empty slug, D3)
   - `PUBLISHER_PREVIEW_BRANCH=whatever preview` on a detached HEAD → `…/{hash}/whatever/`, no warning
   - inspect `package.json`: `root` has **no scheme or host**; `branches` values are full URLs that open
   - `publish` → both branch URLs 404, `branches` empty, **`root` still in `package.json`**, S3 cache cleared
   - `preview` after that publish → **reuses the same root**, uploads **completely** (the cache-staleness
     regression)
   - `publish` twice with no preview in between → second run lists an empty prefix and exits quietly
   - **CI, in a scratch PR:** open a PR with a workflow running `preview` → lands on the head branch's slug,
     not `123-merge`; then `publish` **locally** → the CI-created preview is gone even though `branches` in the
     repo never recorded it (D6)
   - **CI with no committed `root`** → fails with D9's message rather than publishing

---

## Risks

- **Version skew, the significant one.** `getBasePath` runs from the _project's_ installed copy of this
  library. If a `package.json` has been migrated but the installed publisher is older, that copy hits
  `case 'preview': return PKG.preview!`, gets an object where a string belongs, and produces a garbage base
  path rather than an error. Nothing in this library can defend against that from the far side. Mitigated by
  going **major** (M8) so the upgrade can't happen via a silent `^` resolution, and by migration being
  write-on-first-use — a project only acquires the new shape by running a `preview` from the new version, so
  the mismatch requires an actual downgrade afterwards.
- **CI never cleans up previews**, because graphics-bin's delete is a CI no-op. Bounded rather than
  unbounded: previews sit under the committed `root` and a later **local** `publish` sweeps them by prefix,
  recorded or not (D6). A project that only ever publishes from CI accumulates indefinitely — an S3 lifecycle
  rule on `testfiles/` is the right fix, and is out of scope here.
- **Branch-slug collisions** (`feat/x` vs `feat-x`) — accepted, D3.
- **Stale files at a legacy root** (D7). A project's pre-migration preview files stay at the root URL and
  keep serving stale content until publish — anyone holding that old link sees an old build rather than a 404. Accepted deliberately over having `preview` delete from S3.
- **The `_` fallback is shared** (D4). Two people both on a detached HEAD in the same project
  overwrite each other — the very failure this task exists to fix, narrowed to a state that should be
  rare. The warning names `PUBLISHER_PREVIEW_BRANCH`; that's the whole mitigation.
- **Divergent roots from concurrent minting** (D2a) — now confined to a project's **first-ever** preview,
  because `root` persists across publishes. Presents as a one-line `package.json` conflict, and cleanup
  deletes every distinct root regardless, so nothing is orphaned.
- **Preview URLs are reusable** (D2). A branch slug that recurs after a publish resurrects a previously
  deleted URL with unrelated content, so a months-old link can serve a live page instead of 404ing. The
  price of keeping `root` stable.
- **The year segment becomes a creation date** (D2), not a last-touched one — a project maintained across
  years keeps all previews under its founding year's prefix. Relevant only if anything downstream does
  housekeeping by year.
- **`path.sep` in graphics-bin's depth check** means the depth guard misbehaves on Windows. Not our
  platform and not our code; noted only.

---

## Settled by review

Nine questions this plan opened, and the calls made on them:

| Question                                     | Decision                                                                                                                 | Where   |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------- |
| Legacy `reuters.preview` string              | Rewrite to `{ root, branches: {} }`; don't delete the old objects                                                        | D7      |
| Branch unresolvable (detached HEAD, no repo) | Warn and fall back to the shared slug `_`, not an error — collision-proof via D3                                         | D4      |
| Changeset                                    | **Major** (`4.0.0`) — the earlier minor call was papering over a real break                                              | M8      |
| Root storage, and preventing divergence      | Store `root` explicitly and keep it across publishes; keep the random hash                                               | D2, D2a |
| Root's form                                  | An S3 key prefix (`testfiles/2026/hash/`), not a URL; field stays named `root`                                           | D2      |
| How the URL reaches the build                | No new env var — `package.json` is already the channel; `getBasePath` resolves the branch from git                       | D1      |
| `PKG` accessor shape                         | Namespaced (`PKG.preview.branch(slug).url`), matching `PKG.pack` / `PKG.archive(id)` — accepted the major bump to get it | M2, M8  |
| CI preview cleanup                           | No new command. Prefix deletion already sweeps unrecorded CI previews on the next local `publish`                        | D6      |
| CI with no `root` committed                  | Hard failure, not an ephemeral mint — the only unrecoverable state in the design                                         | D9      |

Rejected on the first: deleting the legacy root's objects during migration (a `preview` run shouldn't
delete from S3), and mapping the default branch to the root itself (makes the root undeletable
independently of `main`). Rejected on the second: failing with an error — the command should keep working,
with the collision risk carried by a warning instead.

**On the fourth — why the deterministic-root option was dropped.** Persisting `root` shrinks the divergence
window to a project's first-ever preview, which is small enough that seeding the hash deterministically
isn't worth its costs. Recorded because they're non-obvious and someone will suggest it again:

- `sha256(pkg.name)` — always available, but a project left on a template's default name would **share a
  root with every other such project**, and one project's publish would delete another's previews. Strictly
  worse than the problem being solved.
- `sha256(git remote origin URL)` — genuinely unique, and M1 already adds git calls. But it needs a random
  fallback when there's no remote, which reopens divergence for exactly the scratch projects most likely to
  lack one.
- Either variant must **drop the year from the seed**, or a branch previewed on Dec 31 and one on Jan 1
  diverge anyway — meaning the year segment has to leave the path or be pinned separately, which is the
  thing persisting `root` already does.

---

## Assumptions

**A1 — "Preview images" meant preview _versions_.** The task said "save the specific versions of preview
images in package.json," then specified expanding `reuters.preview` to a map of URLs. In this repo
"preview image" means something else entirely — the og:image thumbnail packed into graphics-server
editions ([pack/edition/utils/getPreviewImgPath.ts](../../src/pack/edition/utils/getPreviewImgPath.ts),
used by `interactive.ts` and `media-interactive.ts`). That is untouched by this plan. Flagging in case a
separate preview-image concern was intended.
