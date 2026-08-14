import { describe, it, expect } from 'vitest';
import { defineConfig, defaultConfig } from './index';

describe('defineConfig', () => {
  describe('array options', () => {
    // The merge used to be positional, so a user's list was overlaid onto the
    // default index by index instead of replacing it. On a default of
    // ['main', 'master'] that made `rootBranches: ['develop']` quietly mean
    // ['develop', 'master'] — the user names one root branch and gets two, and
    // `master` goes on publishing to the canonical preview root against an
    // explicit instruction to the contrary.
    it('replaces a default list rather than merging into it', () => {
      expect(
        defineConfig({ preview: { rootBranches: ['develop'] } }).preview
          .rootBranches
      ).toEqual(['develop']);
    });

    it('lets a shorter list drop entries from the default', () => {
      expect(
        defineConfig({ preview: { rootBranches: ['main'] } }).preview
          .rootBranches
      ).toEqual(['main']);
    });

    it('lets an empty list clear the default outright', () => {
      // Previously impossible: there was no way to say "no branch is canonical".
      expect(
        defineConfig({ preview: { rootBranches: [] } }).preview.rootBranches
      ).toEqual([]);
    });

    it('keeps the default when the option is omitted', () => {
      expect(defineConfig({}).preview.rootBranches).toEqual(['main', 'master']);
    });
  });

  it('still deep-merges objects', () => {
    const config = defineConfig({ build: { outDir: 'build/' } });
    expect(config.build.outDir).toBe('build/');
    // Untouched siblings survive.
    expect(config.build.scripts.preview).toBe('build:preview');
  });

  it('leaves neighbouring keys at their defaults', () => {
    expect(
      defineConfig({ preview: { rootBranches: [] } }).preview.perBranch
    ).toBe(true);
  });

  it('does not mutate the shared defaults', () => {
    // mergeWith writes into its target, and the target is a module singleton —
    // without a clone, one project's config would leak into the next call.
    defineConfig({ preview: { rootBranches: ['only-this'] } });

    expect(defaultConfig.preview.rootBranches).toEqual(['main', 'master']);
    expect(defineConfig({}).preview.rootBranches).toEqual(['main', 'master']);
  });
});
