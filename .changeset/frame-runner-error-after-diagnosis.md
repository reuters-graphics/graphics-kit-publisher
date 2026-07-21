---
'@reuters-graphics/graphics-kit-publisher': patch
---

Frame the runner error that follows a terminal AI diagnosis

After Claude prints a diagnosis in the terminal, the failed command still exits non-zero (so script runners like `npm-run-all` halt and CI fails), which means a runner error like `ELIFECYCLE Command failed with exit code 1` prints right after the diagnosis. That made it look like Claude itself had errored. The publisher now prints a short line between the diagnosis and the runner's error to frame it as the original command's failure. Only shown when the diagnosis ran in the terminal — the VSCode extension path opens the diagnosis elsewhere.
