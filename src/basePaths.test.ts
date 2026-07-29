import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { setProject } from './__test__/project';
import { getBasePath } from './basePaths';
import {
  PLACEHOLDER_BASE,
  PLACEHOLDER_BASE_ENV_VAR,
} from './constants/rewrite';

describe('getBasePath', () => {
  beforeEach(() => {
    setProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        homepage: 'https://www.reuters.com/graphics/my-graphic/',
        reuters: {
          preview: 'https://www.reuters.com/graphics/my-graphic/preview/',
        },
      }),
    });
  });

  describe('dev mode', () => {
    it('returns an empty string', () => {
      const base = getBasePath('dev');
      expect(base).toBe('');
    });

    it('ignores options and returns empty string', () => {
      const base = getBasePath('dev', {
        trailingSlash: true,
        rootRelative: false,
      });
      expect(base).toBe('');
    });

    it('ignores an added path and returns empty string', () => {
      const base = getBasePath('dev', 'cdn');
      expect(base).toBe('cdn');
    });
  });

  describe('test mode', () => {
    it('returns a root-relative path with a trailing slash by default (rootRelative=true, trailingSlash=false)', () => {
      // Defaults: { trailingSlash: false, rootRelative: true }
      const base = getBasePath('test');
      expect(base).toBe('/graphics/testing');
    });

    it('returns a root-relative path WITHOUT a trailing slash (trailingSlash=true)', () => {
      const base = getBasePath('test', {
        trailingSlash: true,
        rootRelative: true,
      });
      expect(base).toBe('/graphics/testing/');
    });

    it('returns the full absolute path WITH trailing slash (rootRelative=false, trailingSlash=false)', () => {
      const base = getBasePath('test', {
        trailingSlash: false,
        rootRelative: false,
      });
      expect(base).toBe('https://www.reuters.com/graphics/testing');
    });

    it('appends an additional path by default and returns root-relative with trailing slash', () => {
      const base = getBasePath('test', 'cdn');
      expect(base).toBe('/graphics/testing/cdn');
    });

    it('appends an additional path without trailing slash if trailingSlash=true', () => {
      const base = getBasePath('test', 'cdn', {
        trailingSlash: true,
        rootRelative: true,
      });
      expect(base).toBe('/graphics/testing/cdn/');
    });
  });

  describe('preview mode', () => {
    it('returns the root-relative preview URL with trailing slash by default', () => {
      const base = getBasePath('preview');
      expect(base).toBe('/graphics/my-graphic/preview');
    });

    it('returns the full absolute preview URL without a trailing slash if trailingSlash=true, rootRelative=false', () => {
      const base = getBasePath('preview', {
        trailingSlash: true,
        rootRelative: false,
      });
      expect(base).toBe('https://www.reuters.com/graphics/my-graphic/preview/');
    });

    it('appends an additional path to the preview URL and keeps it root-relative', () => {
      const base = getBasePath('preview', 'extra-path');
      expect(base).toBe('/graphics/my-graphic/preview/extra-path');
    });
  });

  describe('prod mode', () => {
    it('returns the root-relative production URL with trailing slash by default', () => {
      const base = getBasePath('prod');
      expect(base).toBe('/graphics/my-graphic');
    });

    it('returns the full absolute production URL if rootRelative=false', () => {
      const base = getBasePath('prod', {
        trailingSlash: false,
        rootRelative: false,
      });
      expect(base).toBe('https://www.reuters.com/graphics/my-graphic');
    });

    it('removes the trailing slash if trailingSlash=true, rootRelative=false', () => {
      const base = getBasePath('prod', {
        trailingSlash: true,
        rootRelative: false,
      });
      expect(base).toBe('https://www.reuters.com/graphics/my-graphic/');
    });

    it('appends an additional path to the production URL, root-relative by default', () => {
      const base = getBasePath('prod', 'some-path');
      expect(base).toBe('/graphics/my-graphic/some-path');
    });

    it('should return dev URLs if homepage is not yet set', () => {
      setProject({
        'package.json': JSON.stringify({
          name: 'test-project',
          reuters: {
            preview: 'https://www.reuters.com/graphics/my-graphic/preview/',
          },
        }),
      });

      const base = getBasePath('prod');
      expect(base).toBe('');

      const assets = getBasePath('prod', 'cdn');
      expect(assets).toBe('cdn');
    });
  });

  describe('placeholder base (publisher-driven builds)', () => {
    afterEach(() => {
      delete process.env[PLACEHOLDER_BASE_ENV_VAR];
    });

    it('hands out the placeholder instead of the real base', () => {
      process.env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;

      expect(
        getBasePath('prod', { trailingSlash: true, rootRelative: false })
      ).toBe(PLACEHOLDER_BASE);
    });

    it('applies the usual transforms to it', () => {
      // The point of substituting the base rather than short-circuiting: apps
      // ask for root-relative paths, extra path parts and trailing slashes, and
      // all of that has to keep working so the built output looks normal.
      process.env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;

      expect(
        getBasePath('prod', 'cdn', {
          trailingSlash: false,
          rootRelative: false,
        })
      ).toBe('https://www.reuters.com/graphics/__GKP_BASE__/cdn');
      expect(
        getBasePath('prod', { trailingSlash: false, rootRelative: true })
      ).toBe('/graphics/__GKP_BASE__');
    });

    it('overrides every mode, since the publisher knows what it is building', () => {
      // An app decides its own mode from its own env (NODE_ENV, PREVIEW,
      // TESTING). If the publisher is driving a build it means to rewrite, that
      // decision must not be able to smuggle a real URL into the output.
      process.env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;

      for (const mode of ['dev', 'test', 'preview', 'prod'] as const)
        expect(
          getBasePath(mode, { trailingSlash: true, rootRelative: false })
        ).toBe(PLACEHOLDER_BASE);
    });

    it('is inert when unset', () => {
      expect(
        getBasePath('prod', { trailingSlash: true, rootRelative: false })
      ).toBe('https://www.reuters.com/graphics/my-graphic/');
    });
  });
});
