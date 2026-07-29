# @reuters-graphics/graphics-kit-publisher

## 3.5.0

### Minor Changes

- 9b48dad: Upload the archives you choose, not all of them

  Uploading used to be all-or-nothing: every archive in your pack went to the graphics server, one after another, whether or not it had changed — and the server takes a few minutes to process each one. `upload` now asks which archives you want, with everything preselected, so pressing enter does what it always did.

  That matters most on packs with lots of embeds. A graphics blog that has grown to nine embeds over a fortnight used to re-upload and re-process all nine to fix a typo in one. Now you upload the one you changed and the rest are left untouched, still live and still serving.

  Skipping is safe because each archive now carries its own complete copy of the app's assets and points at them at its own URL. Nothing in a pack depends on anything else in it. Previously every embed referenced the `public` archive's assets, so re-uploading `public` could break every embed pointing at its old asset hashes — which is why you couldn't safely skip anything.

  For scripts and CI: `upload --archives public,media-en-jobs-map` skips the prompt, and in CI with no flag every archive uploads, as before.

  Also in this release:

  - **All prompting happens up front.** Add a new embed and you're asked for its title before anything uploads, rather than a few minutes into a run you'd stopped watching. Credentials and metadata are checked before the build too, so the failures that used to arrive after a long build now arrive before it.
  - **One build instead of two.** The publisher no longer builds your project a second time to bake in URLs, so uploads start sooner.
  - **`edition.*` metadata pointers now resolve where they're documented to** — against each archive's own page. They resolved against the project root, so the default `index.html?title` read a file that usually doesn't exist and every embed asked for its title instead of reading it.
  - **Integrity hashes are correct for the files they guard.** SRI ran before per-archive rewriting, so `integrity` attributes could describe content that no longer matched.

  Nothing to change in your project: same commands, same config, same conventions. The one new option, `build.assetsDir`, only matters if your project has renamed the directory its assets are built to — and if it has, uploading now fails rather than shipping an archive missing its own assets. One thing worth stating plainly — **an embed is a single page**. Only that embed's own page travels with it into its archive, so don't link from an embed to other pages in your project.

### Patch Changes

- 60da504: Support Node 24, and stop doing filesystem work when the publisher is imported

  Importing the publisher used to check the filesystem: the `context` singleton was created at module scope, and its constructor looked for a `package.json` in the current working directory and walked the tree to detect the package manager. So merely importing the library — a Vite config importing `getBasePath`, say — could throw `LocationError: Must run publisher from project root` before any error handling was in place to render it.

  `context.cwd` and `context.pkgMgr` are now resolved when they're first read instead. Commands are unaffected: every one of them already gets the project-root check from `loadUserConfig`, which throws the same `NOT_PROJECT_ROOT` error from inside the CLI's error handling, where it renders properly with its hint.

  Node 24 is now covered in CI (`[20, 22, 24]`). It had been held back by test failures that turned out to be a filesystem-mocking bug rather than a publisher bug: Node 23 moved `fs.rmSync` into a single native binding call, which mock-fs doesn't implement, so deletes under an active mock silently escaped to the real filesystem. The tests that need a project on disk now build a real one in a temp directory instead of mocking, so there's nothing left to fall out of sync with Node's internals.

  Also removes the unused `LocationError` class.

- 9d4f8b7: Test-only: retire mock-fs in favour of real temp projects

  Every remaining suite that mocked the filesystem now writes real fixtures into the throwaway project directory each test file already runs in, and `mock-fs` is gone from devDependencies. No change to shipped code.

  Two tests turned out to have been passing for the wrong reason under the mock, and both are now honest:

  - `src/prompts/select.test.ts` read the developer's real `~/.reuters-graphics/profile.json`. Its assertions only held on a machine whose profile happened to say `desk: "london"` — and on CI, with no profile at all, several would have failed. The harness now points `$HOME` at a temp directory, so no test can read or clobber a real profile. `src/server/credentials.test.ts` no longer needs to stub `os.homedir` for the same reason.
  - `src/pack/edition/types/base.test.ts` asserted that `graphic.jpg` was "not found on file system" while the fixture on disk was `graphic.JPG`. That only holds on a case-sensitive filesystem — it would have passed on CI and failed on any developer's Mac. It now uses a path that is genuinely absent.

## 3.4.7

### Patch Changes

- 844e1a6: Render the terminal AI diagnosis as readable, coloured text

  Claude replies in Markdown, which read poorly in the terminal — raw `##` headings, `**bold**`, `[text](url)` links, and code fences. The terminal diagnosis now:

  - Renders that Markdown to coloured terminal text (bold yellow headings, bold emphasis, cyan inline/fenced code, bullets as `•`, and links collapsed to just their text).
  - Adapts the one-shot `claude -p` prompt so the reply is terminal-friendly: concise, `path:line` file references instead of Markdown links, and no closing question the user can't answer (this is a single non-interactive turn, not a chat).
  - Clarifies the handoff prompt's two options so it's obvious what each does: "Open a Claude Code chat to fix it" (in VSCode) vs "Just tell me what went wrong" (in terminal).

  These changes affect only the terminal surface — the VSCode extension still opens a chat with the unchanged prompt, and the shared diagnostics file is untouched.

## 3.4.6

### Patch Changes

- f3bbdc7: Polish the terminal AI-diagnosis prompt

  - Make the "Diagnose it with AI?" select prompt stand out as the one interactive decision point: a ⛔ prefix, bold text, the command name in cyan, and "AI" in yellow.
  - Add breathing room (blank lines) around the line that frames the runner's trailing error after a terminal diagnosis, so it isn't crowded against the `ELIFECYCLE` output.

## 3.4.5

### Patch Changes

- 897e72f: Don't surface build logs in diagnostics for the publisher's own rule errors

  When a failure was thrown by an internal publisher rule (e.g. `MISSING_OG_IMAGE`) rather than delegated from the build, the diagnostics file still scraped a "Likely cause" from the last build's logs and dumped the `error.log`/`out.log` tails — a red herring, since the build had succeeded. The diagnostics file now includes build logs and a scraped likely cause only for delegated errors (those that carry `logPaths`), matching what the terminal error output already did. Internal rule errors stand on their message, hint, context, and the publisher rule docs.

## 3.4.4

### Patch Changes

- 4494538: Fix the AI-handoff prompt wording for the `diagnose` command

  The `diagnose` command re-opens the last failure on demand, but reused the automatic post-failure prompt — so it asked "Your \"diagnose\" command failed. Diagnose it with AI?", which read as though `diagnose` itself had errored. It now asks "Diagnose the last failed command with AI?".

- f6d2b02: Stop the "Packing up graphic pack" spinner when packing fails

  If a pack failed mid-way (e.g. a missing `og:image` tag), the packing spinner kept animating underneath the rendered error and the AI-handoff prompt, making it look like the process was still running. `packUp` now stops the spinner on failure and rethrows, matching how every other spinner in the publisher already handles errors.

## 3.4.3

### Patch Changes

- d6411a3: Frame the runner error that follows a terminal AI diagnosis

  After Claude prints a diagnosis in the terminal, the failed command still exits non-zero (so script runners like `npm-run-all` halt and CI fails), which means a runner error like `ELIFECYCLE Command failed with exit code 1` prints right after the diagnosis. That made it look like Claude itself had errored. The publisher now prints a short line between the diagnosis and the runner's error to frame it as the original command's failure. Only shown when the diagnosis ran in the terminal — the VSCode extension path opens the diagnosis elsewhere.

## 3.4.2

### Patch Changes

- 1f2d378: Improve the terminal AI diagnosis UX

  - Show a spinner while Claude works, so the terminal no longer looks hung while waiting for a response.
  - Capture Claude's output and print it in a word-wrapped note (wrapped to the terminal width) instead of letting long unwrapped lines overflow the box.
  - Drop Claude's operational stderr notices (e.g. the "claude.ai connectors are disabled…" warning) on success, but surface stderr when the command fails so real problems like auth errors aren't silently swallowed.

## 3.4.1

### Patch Changes

- dd8759f: Improve failure diagnostics: surface the real error and detect natively-installed Claude

  - The likely-error heuristic now scores an error together with its stack trace, so a runtime error whose frames point into your project (e.g. a `ReferenceError` thrown during SvelteKit prerendering) is surfaced ahead of the downstream SvelteKit HTTP-error wrapper that used to win. Errors whose entire trace is inside `node_modules` are demoted, and the surfaced window stops at blank-line block boundaries so it no longer bleeds into an unrelated error below it.
  - The Claude Code terminal handoff now finds Claude when it was installed with the native installer (which exposes `claude` only as a shell alias to `~/.claude/local/claude`, invisible to `PATH` and to `spawn`). The publisher resolves that location and spawns it by absolute path, so the "Ask Claude what went wrong" option appears for those users.

## 3.4.0

### Minor Changes

- 39b6918: Add the Claude Code handoff (issue #141, part 2 of 2). When a command fails in an interactive terminal, the publisher now offers to diagnose it with Claude Code — either opening the VSCode extension (chat next to your code, via a `vscode://` deep-link pre-filled with the diagnostics file) or running a one-shot `claude -p` in the terminal. Availability is detected (VSCode integrated terminal, `claude` on PATH), not credentials — authentication is however you've configured Claude Code. A new `graphics-publisher diagnose` command re-opens the handoff against the last failure without re-running the command, and a `publisher.config.ts` `ai: 'prompt' | 'off'` setting (plus `--no-ai`) controls the automatic prompt. Skipped in CI / non-TTY.
- 3324f6b: Improve error diagnostics (issue #141, part 1 of 2). Custom errors now extend a `PublisherError` base class carrying a machine-readable `code`, the running `command`, `logPaths`, a remediation `hint`, and structured `context`. On any failure the CLI writes a prompt-ready, secret-redacted diagnostics file to `.graphics-kit/diagnostics/latest.md` (only when git-ignored, so it can't be committed), and the terminal output now leads with a heuristic "likely cause" from the build logs plus the fix hint, hiding the raw stack behind `--verbose`/`DEBUG`.
- f7cd913: Update `@clack/prompts` (0.10 → 1.7) and `@reuters-graphics/clack` (0.0.2 → 1.0) to their v1 releases. These are ESM-only and require Node ≥20.12, so the publisher's minimum Node version is now `>=20.12.0`. No consumer-facing API changes.

## 3.3.1

### Patch Changes

- e398a31: Fix CLI hanging for ~1–2 minutes after commands finished. The CLI now exits promptly once a command resolves instead of waiting on keep-alive sockets held open by dependencies (e.g. the AWS SDK S3 client).

## 3.3.0

### Minor Changes

- d5b953f: Ships LLM context docs with the package for consuming projects' coding agents. Adds an `llms/` folder of terse, agent-oriented reference docs (graphics server model, pack metadata, page-building/routing rules, config, and a glossary) and declares them under a new `llms` field in `package.json` so downstream tooling can hoist them into a project's `.claude/llms/`. Also adds a human-facing docs page explaining the docs exist and that library developers may need to update them.

  Fixes an incorrect validation message on the pack `title` max-length rule (it referenced "Description").

## 3.2.0

### Minor Changes

- f79b054: Removes PNG/JPG editions from eligibility to promote in Lynx following LSEG updates to accept interactives.

## 3.1.2

### Patch Changes

- e13517c: Cleans up invalid temp tokens.

## 3.1.1

### Patch Changes

- 5f1827e: Bump @reuters-graphics/server-client

## 3.1.0

### Minor Changes

- 6e0de7d: Adds SRI attributes to assets in media index.html files
- 8c238ba: Adds manifests to embeddable interactive editions for LSEG compatibility.

## 3.0.6

### Patch Changes

- 428420b: Improved build log errors

## 3.0.5

### Patch Changes

- 4d41e27: Fixes metadata validation to ensure project has at least one author

## 3.0.4

### Patch Changes

- 658334a: Changes the prompt for a server token, which fixes cases on some computers where the long Sphinx token breaks integrated terminals.

## 3.0.3

### Patch Changes

- 7842ecc: Changes handling for pack title and description.

## 3.0.2

### Patch Changes

- 86ac092: Fixes separate assets issues #95 and #96.

## 3.0.1

### Patch Changes

- 26ec4aa: Won't prompt for Lynx or Connect publishing if there are no elegible editions to go there. Fixes #90.
- 035ed69: Fixes validation rules on pack title and description for #87."
- 1411085: Adds separate asset handling, uploading a directory of assets to S3 directly and NOT to the graphics server, per #89.

## 3.0.0

### Major Changes

- f8adacc: Graphics kit publisher 3.0! 🎉

  A top-to-bottom rewrite of the library that overhauls publisher configuration and pack filesystem discovery process; now more flexible to cover more types of graphics projects.

  Read more on our [new docs site](https://reuters-graphics.github.io/graphics-kit-publisher/).

## 2.1.1

### Patch Changes

- f3bda68: Hotfix: Removes empty files from dist directory after build to avoid graphics server validation error.

## 2.1.0

### Minor Changes

- 8f33a59: Bump graphics-bin

## 2.0.1

### Patch Changes

- c8bc092: Bumps graphics-bin

## 2.0.0

### Major Changes

- 5da8705: New graphics-bin and preview handling with wider rewrite of the library
