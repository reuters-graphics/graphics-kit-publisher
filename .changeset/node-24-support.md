---
'@reuters-graphics/graphics-kit-publisher': patch
---

Support Node 24, and stop doing filesystem work when the publisher is imported

Importing the publisher used to check the filesystem: the `context` singleton was created at module scope, and its constructor looked for a `package.json` in the current working directory and walked the tree to detect the package manager. So merely importing the library — a Vite config importing `getBasePath`, say — could throw `LocationError: Must run publisher from project root` before any error handling was in place to render it.

`context.cwd` and `context.pkgMgr` are now resolved when they're first read instead. Commands are unaffected: every one of them already gets the project-root check from `loadUserConfig`, which throws the same `NOT_PROJECT_ROOT` error from inside the CLI's error handling, where it renders properly with its hint.

Node 24 is now covered in CI (`[20, 22, 24]`). It had been held back by test failures that turned out to be a filesystem-mocking bug rather than a publisher bug: Node 23 moved `fs.rmSync` into a single native binding call, which mock-fs doesn't implement, so deletes under an active mock silently escaped to the real filesystem. The tests that need a project on disk now build a real one in a temp directory instead of mocking, so there's nothing left to fall out of sync with Node's internals.

Also removes the unused `LocationError` class.
