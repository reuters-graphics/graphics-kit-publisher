# @reuters-graphics/graphics-kit-publisher

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
