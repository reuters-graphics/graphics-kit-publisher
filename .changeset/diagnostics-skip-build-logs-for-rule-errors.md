---
'@reuters-graphics/graphics-kit-publisher': patch
---

Don't surface build logs in diagnostics for the publisher's own rule errors

When a failure was thrown by an internal publisher rule (e.g. `MISSING_OG_IMAGE`) rather than delegated from the build, the diagnostics file still scraped a "Likely cause" from the last build's logs and dumped the `error.log`/`out.log` tails — a red herring, since the build had succeeded. The diagnostics file now includes build logs and a scraped likely cause only for delegated errors (those that carry `logPaths`), matching what the terminal error output already did. Internal rule errors stand on their message, hint, context, and the publisher rule docs.
