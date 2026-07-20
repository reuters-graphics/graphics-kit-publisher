---
'@reuters-graphics/graphics-kit-publisher': minor
---

Improve error diagnostics (issue #141, part 1 of 2). Custom errors now extend a `PublisherError` base class carrying a machine-readable `code`, the running `command`, `logPaths`, a remediation `hint`, and structured `context`. On any failure the CLI writes a prompt-ready, secret-redacted diagnostics file to `.graphics-kit/diagnostics/latest.md` (only when git-ignored, so it can't be committed), and the terminal output now leads with a heuristic "likely cause" from the build logs plus the fix hint, hiding the raw stack behind `--verbose`/`DEBUG`.
