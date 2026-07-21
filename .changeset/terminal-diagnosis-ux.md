---
'@reuters-graphics/graphics-kit-publisher': patch
---

Improve the terminal AI diagnosis UX

- Show a spinner while Claude works, so the terminal no longer looks hung while waiting for a response.
- Capture Claude's output and print it in a word-wrapped note (wrapped to the terminal width) instead of letting long unwrapped lines overflow the box.
- Drop Claude's operational stderr notices (e.g. the "claude.ai connectors are disabled…" warning) on success, but surface stderr when the command fails so real problems like auth errors aren't silently swallowed.
