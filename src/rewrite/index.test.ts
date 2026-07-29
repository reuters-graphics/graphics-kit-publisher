import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import dedent from 'dedent';

import { projectDir, setProject } from '../__test__/project';
import {
  assertNoResidualTokens,
  assertReferencedFilesExist,
  deriveMappings,
  rewriteDir,
} from '.';
import { PLACEHOLDER_BASE, PLACEHOLDER_TOKEN } from '../constants/rewrite';

const ARCHIVE_URL =
  'https://www.reuters.com/graphics/my-graphic/wild/6ay7t0h3ipx';
const ARCHIVE_PATH = '/graphics/my-graphic/wild/6ay7t0h3ipx';
const BASE = 'https://www.reuters.com/graphics/__GKP_BASE__';
const BASE_PATH = '/graphics/__GKP_BASE__';

const plan = {
  placeholderBase: PLACEHOLDER_BASE,
  archiveUrl: ARCHIVE_URL,
  hoistedPath: 'embeds/en/map',
};

/** Rewrite the temp project's `archive/` directory with the standard plan. */
const rewriteArchive = (hoistedPath?: string) =>
  rewriteDir(
    path.join(projectDir, 'archive'),
    deriveMappings({ ...plan, hoistedPath })
  );

const read = (file: string) =>
  fs.readFileSync(path.join(projectDir, 'archive', file), 'utf8');

beforeEach(() => {
  setProject({});
});

describe('deriveMappings', () => {
  it('orders mappings longest-first', () => {
    const lengths = deriveMappings(plan).map(({ from }) => from.length);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
  });

  it('collapses the hoisted page path to the archive root', () => {
    expect(deriveMappings(plan)).toEqual(
      expect.arrayContaining([
        { from: `${BASE}/embeds/en/map`, to: ARCHIVE_URL },
        { from: `${BASE_PATH}/embeds/en/map`, to: ARCHIVE_PATH },
      ])
    );
  });

  it('omits page mappings when nothing is hoisted', () => {
    const mappings = deriveMappings({ ...plan, hoistedPath: undefined });
    expect(mappings).toEqual([
      { from: BASE, to: ARCHIVE_URL },
      { from: BASE_PATH, to: ARCHIVE_PATH },
    ]);
  });

  it('tolerates trailing slashes on either side', () => {
    expect(
      deriveMappings({
        placeholderBase: `${BASE}/`,
        archiveUrl: `${ARCHIVE_URL}/`,
        hoistedPath: 'embeds/en/map/',
      })
    ).toEqual(deriveMappings(plan));
  });
});

describe('rewriteDir', () => {
  it('rewrites the absolute and root-relative forms of the base', () => {
    // Both forms appear in real output: `paths.assets` is absolute while
    // `paths.base` is root-relative.
    setProject({
      'archive/index.html': dedent`
        <link rel="canonical" href="${BASE}/embeds/en/map/"/>
        <link rel="stylesheet" href="${BASE}/cdn/_app/main.css"/>
        <script>{ base: "${BASE_PATH}", assets: "${BASE}/cdn" }</script>`,
    });

    const report = rewriteArchive('embeds/en/map');
    const html = read('index.html');

    expect(html).toContain(`href="${ARCHIVE_URL}/"`);
    expect(html).toContain(`href="${ARCHIVE_URL}/cdn/_app/main.css"`);
    expect(html).toContain(`base: "${ARCHIVE_PATH}"`);
    expect(html).toContain(`assets: "${ARCHIVE_URL}/cdn"`);
    expect(report.total).toBe(4);
    expect(report.filesChanged).toBe(1);
  });

  it('does not corrupt the absolute form when rewriting the root-relative one', () => {
    // The regression this ordering exists to prevent: the absolute form
    // CONTAINS the root-relative form, so a naive short-first pass would turn
    // `https://www.reuters.com/graphics/__GKP_BASE__` into
    // `https://www.reuters.com/graphics/my-graphic/...` nested inside itself.
    setProject({ 'archive/app.js': `a="${BASE}/cdn";b="${BASE_PATH}/cdn"` });

    rewriteArchive();

    expect(read('app.js')).toBe(
      `a="${ARCHIVE_URL}/cdn";b="${ARCHIVE_PATH}/cdn"`
    );
  });

  it('rewrites sourcemaps as well as their sources', () => {
    setProject({
      'archive/cdn/app.js': `fetch("${BASE}/cdn/data.json")`,
      'archive/cdn/app.js.map': `{"sourcesContent":["fetch('${BASE}/cdn/data.json')"]}`,
    });

    const report = rewriteArchive();

    expect(read('cdn/app.js.map')).toContain(`${ARCHIVE_URL}/cdn/data.json`);
    expect(report.filesChanged).toBe(2);
  });

  it('leaves binary files untouched', () => {
    // A PNG whose bytes happen to contain the token must not be rewritten —
    // and must not be corrupted by a utf8 round-trip either.
    const bytes = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(`${BASE}/cdn`),
      Buffer.from([0x00, 0xff, 0xfe]),
    ]);
    setProject({ 'archive/cdn/graphic.png': bytes });

    const report = rewriteArchive();

    expect(
      fs
        .readFileSync(path.join(projectDir, 'archive/cdn/graphic.png'))
        .equals(bytes)
    ).toBe(true);
    expect(report.filesScanned).toBe(0);
  });

  it('reports per-mapping counts', () => {
    setProject({
      'archive/index.html': `${BASE}/embeds/en/map/ ${BASE}/cdn ${BASE_PATH}`,
    });

    const byFrom = Object.fromEntries(
      rewriteArchive('embeds/en/map').replacements.map(({ from, count }) => [
        from,
        count,
      ])
    );

    expect(byFrom[`${BASE}/embeds/en/map`]).toBe(1);
    expect(byFrom[BASE]).toBe(1);
    expect(byFrom[BASE_PATH]).toBe(1);
  });

  it('skips files with nothing to rewrite', () => {
    setProject({
      'archive/index.html': '<html>no urls here</html>',
      'archive/cdn/app.js': `a="${BASE}/cdn"`,
    });

    const report = rewriteArchive();

    expect(report.filesScanned).toBe(2);
    expect(report.filesChanged).toBe(1);
  });
});

describe('assertNoResidualTokens', () => {
  const archiveDir = () => path.join(projectDir, 'archive');

  it('passes on a fully rewritten archive', () => {
    setProject({
      'archive/index.html': `<link rel="canonical" href="${BASE}/embeds/en/map/"/>`,
    });
    rewriteArchive('embeds/en/map');

    expect(() => assertNoResidualTokens(archiveDir())).not.toThrow();
  });

  it('throws listing every file that still holds the placeholder', () => {
    setProject({
      'archive/index.html': `<a href="${BASE}/embeds/en/other/">other</a>`,
      'archive/cdn/app.js': `a="${BASE}/cdn"`,
      'archive/cdn/clean.js': 'a="/relative"',
    });
    // Rewrite with a plan that doesn't cover this project's base at all.
    rewriteDir(
      archiveDir(),
      deriveMappings({
        placeholderBase: 'https://www.reuters.com/graphics/OTHER_TOKEN/',
        archiveUrl: ARCHIVE_URL,
      })
    );

    let thrown: Error | undefined;
    try {
      assertNoResidualTokens(archiveDir());
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown?.message).toContain('index.html');
    expect(thrown?.message).toContain(path.join('cdn', 'app.js'));
    expect(thrown?.message).not.toContain('clean.js');
    expect(thrown?.message).toContain(PLACEHOLDER_TOKEN);
  });

  it("catches SvelteKit's prerender host", () => {
    setProject({
      'archive/index.html': '<meta content="http://sveltekit-prerender/x"/>',
    });

    expect(() => assertNoResidualTokens(archiveDir())).toThrow(
      'sveltekit-prerender'
    );
  });

  it('ignores tokens inside binary files', () => {
    setProject({
      'archive/cdn/graphic.png': Buffer.from(`\x89PNG${PLACEHOLDER_TOKEN}`),
    });

    expect(() => assertNoResidualTokens(archiveDir())).not.toThrow();
  });
});

describe('assertReferencedFilesExist', () => {
  const editionDir = () => path.join(projectDir, 'archive');

  it('passes when the archive contains what its page asks for', () => {
    setProject({
      'archive/index.html': `<script src="${ARCHIVE_URL}/cdn/app.js"></script>`,
      'archive/cdn/app.js': 'console.log(1)',
    });

    expect(() =>
      assertReferencedFilesExist(editionDir(), ARCHIVE_URL)
    ).not.toThrow();
  });

  it("names files the archive references but doesn't contain", () => {
    // The failure this exists for: a project whose assets aren't where the
    // publisher looked, so nothing was copied. Rewriting succeeded, no
    // placeholder survived, and the embed would 404 its own JavaScript.
    setProject({
      'archive/index.html': `<html><head>
        <script src="${ARCHIVE_URL}/static-assets/app.js"></script>
        <link rel="stylesheet" href="${ARCHIVE_URL}/static-assets/main.css">
        </head></html>`,
    });

    let thrown: Error | undefined;
    try {
      assertReferencedFilesExist(editionDir(), ARCHIVE_URL);
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown?.message).toContain('static-assets/app.js');
    expect(thrown?.message).toContain('static-assets/main.css');
    expect(JSON.stringify(thrown)).toContain('ARCHIVE_NOT_SELF_CONTAINED');
  });

  it('ignores references that are not file requests', () => {
    // SvelteKit bakes the assets base in as a bare directory URL, and pages
    // link to other pages. Neither is a file, so neither is checked.
    setProject({
      'archive/index.html': `<html><head>
        <link rel="canonical" href="${ARCHIVE_URL}/" />
        <script>{ assets: "${ARCHIVE_URL}/cdn" }</script>
        <a href="${ARCHIVE_URL}/embeds/en/map/">map</a>
        </head></html>`,
    });

    expect(() =>
      assertReferencedFilesExist(editionDir(), ARCHIVE_URL)
    ).not.toThrow();
  });

  it('ignores files hosted somewhere else', () => {
    setProject({
      'archive/index.html':
        '<script src="https://cdn.example.com/third-party.js"></script>',
    });

    expect(() =>
      assertReferencedFilesExist(editionDir(), ARCHIVE_URL)
    ).not.toThrow();
  });

  it('resolves from the edition root, not the page directory', () => {
    // Archive URLs are absolute, so a nested page's reference to
    // `{archive}/cdn/app.js` is the same file as the root page's.
    setProject({
      'archive/embeds/en/map/index.html': `<script src="${ARCHIVE_URL}/cdn/app.js"></script>`,
      'archive/cdn/app.js': 'console.log(1)',
    });

    expect(() =>
      assertReferencedFilesExist(editionDir(), ARCHIVE_URL)
    ).not.toThrow();
  });
});
