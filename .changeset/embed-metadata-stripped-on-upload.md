---
'@reuters-graphics/graphics-kit-publisher': patch
---

Stop silently dropping embed code from uploaded archives

Since 3.5.0, an interactive archive's embed `declaration` and `dependencies` were computed correctly but never reached the server: `Archive.createOrUpdate` started validating metadata with `validateOrThrow` before upload, and the validator's schema didn't declare an `embed` field, so valibot's default key-stripping silently dropped it from the validated object actually sent to `createEditions`/`updateEditions`. The schema now declares `embed` as optional, matching the metadata's TS type, so it survives validation.
