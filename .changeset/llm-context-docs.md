---
'@reuters-graphics/graphics-kit-publisher': minor
---

Ships LLM context docs with the package for consuming projects' coding agents. Adds an `llms/` folder of terse, agent-oriented reference docs (graphics server model, pack metadata, page-building/routing rules, config, and a glossary) and declares them under a new `llms` field in `package.json` so downstream tooling can hoist them into a project's `.claude/llms/`. Also adds a human-facing docs page explaining the docs exist and that library developers may need to update them.

Fixes an incorrect validation message on the pack `title` max-length rule (it referenced "Description").
