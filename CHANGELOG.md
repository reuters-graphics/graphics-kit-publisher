# @reuters-graphics/graphics-kit-publisher

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
