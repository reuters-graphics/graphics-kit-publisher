---
'@reuters-graphics/graphics-kit-publisher': patch
---

Stop the "Packing up graphic pack" spinner when packing fails

If a pack failed mid-way (e.g. a missing `og:image` tag), the packing spinner kept animating underneath the rendered error and the AI-handoff prompt, making it look like the process was still running. `packUp` now stops the spinner on failure and rethrows, matching how every other spinner in the publisher already handles errors.
