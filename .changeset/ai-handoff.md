---
'@reuters-graphics/graphics-kit-publisher': minor
---

Add the Claude Code handoff (issue #141, part 2 of 2). When a command fails in an interactive terminal, the publisher now offers to diagnose it with Claude Code — either opening the VSCode extension (chat next to your code, via a `vscode://` deep-link pre-filled with the diagnostics file) or running a one-shot `claude -p` in the terminal. Availability is detected (VSCode integrated terminal, `claude` on PATH), not credentials — authentication is however you've configured Claude Code. A new `graphics-publisher diagnose` command re-opens the handoff against the last failure without re-running the command, and a `publisher.config.ts` `ai: 'prompt' | 'off'` setting (plus `--no-ai`) controls the automatic prompt. Skipped in CI / non-TTY.
