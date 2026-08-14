import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { setProject } from '../../__test__/project';
import { isolateBranchEnv } from '../../__test__/branchEnv';
import { context } from '../../context';

import { getPreviewRoot, getPreviewURL } from '.';
import { PackageConfigError } from '../../exceptions/errors';
import { utils } from '@reuters-graphics/graphics-bin';

isolateBranchEnv();

const ROOT = 'https://example.org/preview-url/';

describe('getPreviewRoot', () => {
  beforeEach(() => {
    setProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        reuters: {},
      }),
    });
  });

  it('returns the existing preview URL if present in package.json', () => {
    utils.setPkgProp('reuters.preview', ROOT);

    expect(getPreviewRoot()).toBe(ROOT);

    // Verify that it did NOT get overwritten
    expect(utils.getPkgProp('reuters.preview')).toBe(ROOT);
  });

  it('generates and saves a preview URL if none is present', () => {
    expect(utils.getPkgProp('reuters.preview')).toBeUndefined();

    const result = getPreviewRoot();

    expect(result).toMatch(/^https?:\/\//);
    const currentYear = new Date().getFullYear().toString();
    expect(result).toContain(`/testfiles/${currentYear}/`);

    // Confirm it was saved to package.json
    expect(utils.getPkgProp('reuters.preview')).toBe(result);
  });
});

describe('getPreviewURL', () => {
  const originalPreview = context.config.preview;

  beforeEach(() => {
    setProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        reuters: { preview: ROOT },
      }),
    });
    context.config.preview = { ...originalPreview };
  });

  afterEach(() => {
    context.config.preview = originalPreview;
  });

  it('puts a branch in its own subdirectory of the preview root', () => {
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    expect(getPreviewURL()).toBe(`${ROOT}_branches/feat-new-map/`);
  });

  it('keeps branch builds clear of the canonical build’s own directories', () => {
    // "cdn" and "embeds" are real output directories, and every top-level route
    // is one too — "world-cup-2026" is a page *and* a plausible branch name.
    // Without the reserved directory these upload over the canonical preview,
    // corrupting the thing per-branch previews exist to protect.
    for (const name of ['cdn', 'embeds', 'world-cup-2026']) {
      expect(getPreviewURL(name)).toBe(`${ROOT}_branches/${name}/`);
    }
  });

  it('keeps the trailing slash when the root has none', () => {
    utils.setPkgProp('reuters.preview', 'https://example.org/preview-url');
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    expect(getPreviewURL()).toBe(
      'https://example.org/preview-url/_branches/feat-new-map/'
    );
  });

  it('returns a directory URL for the root too, when package.json lacks the slash', () => {
    // Everything downstream — the S3 key prefix, the base path handed to the
    // build — treats this as a directory, so it can't depend on how the URL was
    // hand-typed into package.json.
    utils.setPkgProp('reuters.preview', 'https://example.org/preview-url');
    process.env.GITHUB_REF_NAME = 'main';

    expect(getPreviewURL()).toBe('https://example.org/preview-url/');
  });

  describe('a hand-edited root that isn’t just an origin and a path', () => {
    // The preview URL is read two incompatible ways: a browser resolves it as a
    // URL, while the S3 key prefix is taken from the serialized string. Patching
    // a slash onto the end of `…/project?stage=1` uploads to
    // `project?stage=1/_branches/feat/` while the browser asks for `/project` —
    // the objects and the advertised URL stop addressing the same prefix.
    it('rejects a query string rather than publishing somewhere else', () => {
      utils.setPkgProp(
        'reuters.preview',
        'https://example.org/project?stage=1'
      );
      process.env.GITHUB_HEAD_REF = 'feat/new-map';

      expect(() => getPreviewURL()).toThrow(PackageConfigError);
      expect(() => getPreviewURL()).toThrow(/query string/);
    });

    it('rejects a fragment for the same reason', () => {
      utils.setPkgProp('reuters.preview', 'https://example.org/project#frag');
      process.env.GITHUB_HEAD_REF = 'feat/new-map';

      expect(() => getPreviewURL()).toThrow(PackageConfigError);
      expect(() => getPreviewURL()).toThrow(/fragment/);
    });

    it('rejects something that isn’t a URL at all', () => {
      utils.setPkgProp('reuters.preview', 'not-a-url');

      expect(() => getPreviewURL()).toThrow(PackageConfigError);
    });

    it('leaves a legitimate root untouched', () => {
      // Guard against over-eager normalising: nothing about a normal URL should
      // change, including one already ending in a slash.
      utils.setPkgProp('reuters.preview', ROOT);
      process.env.GITHUB_REF_NAME = 'main';

      expect(getPreviewURL()).toBe(ROOT);
    });
  });

  it('publishes a root branch to the preview root itself', () => {
    process.env.GITHUB_REF_NAME = 'main';

    expect(getPreviewURL()).toBe(ROOT);
  });

  it('publishes to the root when the caller asks for it', () => {
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    expect(getPreviewURL(false)).toBe(ROOT);
  });

  it('publishes to the root when per-branch previews are off', () => {
    context.config.preview.perBranch = false;
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    expect(getPreviewURL()).toBe(ROOT);
  });

  it('never writes the branch URL back to package.json', () => {
    // The whole point of splitting root from branch. Writing it back would put
    // a different value in package.json on every branch — a standing merge
    // conflict — and leave the working tree dirty after a preview, which some
    // projects read as "there's publish metadata to commit".
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    const url = getPreviewURL();

    expect(url).toBe(`${ROOT}_branches/feat-new-map/`);
    expect(utils.getPkgProp('reuters.preview')).toBe(ROOT);
  });

  it('mints a root, then hangs the branch beneath it, when there is none yet', () => {
    setProject({
      'package.json': JSON.stringify({ name: 'test-project', reuters: {} }),
    });
    process.env.GITHUB_HEAD_REF = 'feat/new-map';

    const url = getPreviewURL();
    const root = utils.getPkgProp('reuters.preview') as string;

    expect(root).toBeDefined();
    expect(url).toBe(`${root}_branches/feat-new-map/`);
  });
});
