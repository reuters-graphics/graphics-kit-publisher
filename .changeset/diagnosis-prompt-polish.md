---
'@reuters-graphics/graphics-kit-publisher': patch
---

Polish the terminal AI-diagnosis prompt

- Make the "Diagnose it with AI?" select prompt stand out as the one interactive decision point: a ⛔ prefix, bold text, the command name in cyan, and "AI" in yellow.
- Add breathing room (blank lines) around the line that frames the runner's trailing error after a terminal diagnosis, so it isn't crowded against the `ELIFECYCLE` output.
