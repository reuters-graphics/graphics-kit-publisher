---
'@reuters-graphics/graphics-kit-publisher': minor
---

Upload the archives you choose, not all of them

Uploading used to be all-or-nothing: every archive in your pack went to the graphics server, one after another, whether or not it had changed — and the server takes a few minutes to process each one. `upload` now asks which archives you want, with everything preselected, so pressing enter does what it always did.

That matters most on packs with lots of embeds. A graphics blog that has grown to nine embeds over a fortnight used to re-upload and re-process all nine to fix a typo in one. Now you upload the one you changed and the rest are left untouched, still live and still serving.

Skipping is safe because each archive now carries its own complete copy of the app's assets and points at them at its own URL. Nothing in a pack depends on anything else in it. Previously every embed referenced the `public` archive's assets, so re-uploading `public` could break every embed pointing at its old asset hashes — which is why you couldn't safely skip anything.

For scripts and CI: `upload --archives public,media-en-jobs-map` skips the prompt, and in CI with no flag every archive uploads, as before.

Also in this release:

- **All prompting happens up front.** Add a new embed and you're asked for its title before anything uploads, rather than a few minutes into a run you'd stopped watching. Credentials and metadata are checked before the build too, so the failures that used to arrive after a long build now arrive before it.
- **One build instead of two.** The publisher no longer builds your project a second time to bake in URLs, so uploads start sooner.
- **`edition.*` metadata pointers now resolve where they're documented to** — against each archive's own page. They resolved against the project root, so the default `index.html?title` read a file that usually doesn't exist and every embed asked for its title instead of reading it.
- **Integrity hashes are correct for the files they guard.** SRI ran before per-archive rewriting, so `integrity` attributes could describe content that no longer matched.

Nothing to change in your project: same commands, same config, same conventions. One thing worth stating plainly — **an embed is a single page**. Only that embed's own page travels with it into its archive, so don't link from an embed to other pages in your project.
