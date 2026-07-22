---
'@reuters-graphics/graphics-kit-publisher': patch
---

Render the terminal AI diagnosis as readable, coloured text

Claude replies in Markdown, which read poorly in the terminal — raw `##` headings, `**bold**`, `[text](url)` links, and code fences. The terminal diagnosis now:

- Renders that Markdown to coloured terminal text (bold yellow headings, bold emphasis, cyan inline/fenced code, bullets as `•`, and links collapsed to just their text).
- Adapts the one-shot `claude -p` prompt so the reply is terminal-friendly: concise, `path:line` file references instead of Markdown links, and no closing question the user can't answer (this is a single non-interactive turn, not a chat).
- Clarifies the handoff prompt's two options so it's obvious what each does: "Open a Claude Code chat to fix it" (in VSCode) vs "Just tell me what went wrong" (in terminal).

These changes affect only the terminal surface — the VSCode extension still opens a chat with the unchanged prompt, and the shared diagnostics file is untouched.
