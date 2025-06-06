# @reuters-graphics/graphics-kit-publisher

## 3.0.6

### Patch Changes

- 428420b: Improved build log errors

## 3.0.5

### Patch Changes

- 4d41e27: Fixes metadata validation to ensure project has at least one author

## 3.0.4

### Patch Changes

- 658334a: Changes the prompt for a server token, which fixes cases on some computers where the long Sphinx token breaks integrated terminals.

## 3.0.3

### Patch Changes

- 7842ecc: Changes handling for pack title and description.

## 3.0.2

### Patch Changes

- 86ac092: Fixes separate assets issues #95 and #96.

## 3.0.1

### Patch Changes

- 26ec4aa: Won't prompt for Lynx or Connect publishing if there are no elegible editions to go there. Fixes #90.
- 035ed69: Fixes validation rules on pack title and description for #87."
- 1411085: Adds separate asset handling, uploading a directory of assets to S3 directly and NOT to the graphics server, per #89.

## 3.0.0

### Major Changes

- f8adacc: Graphics kit publisher 3.0! 🎉

  A top-to-bottom rewrite of the library that overhauls publisher configuration and pack filesystem discovery process; now more flexible to cover more types of graphics projects.

  Read more on our [new docs site](https://reuters-graphics.github.io/graphics-kit-publisher/).

## 2.1.1

### Patch Changes

- f3bda68: Hotfix: Removes empty files from dist directory after build to avoid graphics server validation error.

## 2.1.0

### Minor Changes

- 8f33a59: Bump graphics-bin

## 2.0.1

### Patch Changes

- c8bc092: Bumps graphics-bin

## 2.0.0

### Major Changes

- 5da8705: New graphics-bin and preview handling with wider rewrite of the library
