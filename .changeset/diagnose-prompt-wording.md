---
'@reuters-graphics/graphics-kit-publisher': patch
---

Fix the AI-handoff prompt wording for the `diagnose` command

The `diagnose` command re-opens the last failure on demand, but reused the automatic post-failure prompt — so it asked "Your \"diagnose\" command failed. Diagnose it with AI?", which read as though `diagnose` itself had errored. It now asks "Diagnose the last failed command with AI?".
