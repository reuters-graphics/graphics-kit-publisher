---
'@reuters-graphics/graphics-kit-publisher': minor
---

Improve failure diagnostics: surface the real error and detect natively-installed Claude

- The likely-error heuristic now scores an error together with its stack trace, so a runtime error whose frames point into your project (e.g. a `ReferenceError` thrown during SvelteKit prerendering) is surfaced ahead of the downstream SvelteKit HTTP-error wrapper that used to win. Errors whose entire trace is inside `node_modules` are demoted, and the surfaced window stops at blank-line block boundaries so it no longer bleeds into an unrelated error below it.
- The Claude Code terminal handoff now finds Claude when it was installed with the native installer (which exposes `claude` only as a shell alias to `~/.claude/local/claude`, invisible to `PATH` and to `spawn`). The publisher resolves that location and spawns it by absolute path, so the "Ask Claude what went wrong" option appears for those users.
