---
'@reuters-graphics/graphics-kit-publisher': patch
---

Test-only: retire mock-fs in favour of real temp projects

Every remaining suite that mocked the filesystem now writes real fixtures into the throwaway project directory each test file already runs in, and `mock-fs` is gone from devDependencies. No change to shipped code.

Two tests turned out to have been passing for the wrong reason under the mock, and both are now honest:

- `src/prompts/select.test.ts` read the developer's real `~/.reuters-graphics/profile.json`. Its assertions only held on a machine whose profile happened to say `desk: "london"` — and on CI, with no profile at all, several would have failed. The harness now points `$HOME` at a temp directory, so no test can read or clobber a real profile. `src/server/credentials.test.ts` no longer needs to stub `os.homedir` for the same reason.
- `src/pack/edition/types/base.test.ts` asserted that `graphic.jpg` was "not found on file system" while the fixture on disk was `graphic.JPG`. That only holds on a case-sensitive filesystem — it would have passed on CI and failed on any developer's Mac. It now uses a path that is genuinely absent.
