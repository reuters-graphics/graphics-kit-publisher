import { describe, it, expect, beforeEach, vi } from 'vitest';
import dedent from 'dedent';

import { setProject } from '../../__test__/project';
import { Pack } from '..';
import { Interactive } from '../edition/types/interactive';

/**
 * Any prompt in these tests is a failure: the point of an `edition.*` metadata
 * pointer is that the value is read from the archive's own page, so if the
 * pointer resolves correctly the user is never asked.
 */
vi.mock('@clack/prompts', async () => {
  const actual =
    await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts');
  return {
    ...actual,
    text: vi.fn(() => {
      throw new Error('Prompted the user instead of reading the pointer file');
    }),
  };
});

const page = (title: string, description: string) => dedent`<html>
  <head>
  <title>${title}</title>
  <meta property="og:description" content="${description}" />
  <link rel="canonical" href="https://www.reuters.com/graphics/__GKP_BASE__/embeds/en/map/" />
  </head>
  </html>`;

beforeEach(() => {
  setProject({
    'package.json': JSON.stringify({
      reuters: { graphic: { title: 'Pack title:', description: 'Pack desc:' } },
    }),
    'dist/embeds/en/map/index.html': page('Map title', 'Map description'),
    'dist/embeds/en/chart/index.html': page('Chart title', 'Chart description'),
  });
});

describe('archive metadata pointers', () => {
  it("resolves edition pointers against the archive's own page", async () => {
    // The default pointers are `index.html?title` and
    // `index.html?meta.og:description`, documented as relative to each edition's
    // root. They used to resolve against the working directory, so every archive
    // read the same project-root index.html — normally absent, so every archive
    // prompted instead.
    const pack = new Pack();
    pack.metadata.title = 'Pack title:';
    pack.metadata.description = 'Pack desc:';
    const map = new Interactive(
      pack,
      'dist/embeds/en/map/index.html',
      'en',
      'map'
    ).archive;

    const metadata = await map.collectMetadata();

    expect(metadata.title).toBe('Map title');
    expect(metadata.description).toBe('Map description');
  });

  it('gives each archive its own values', async () => {
    const pack = new Pack();
    pack.metadata.title = 'Pack title:';
    pack.metadata.description = 'Pack desc:';
    const map = new Interactive(
      pack,
      'dist/embeds/en/map/index.html',
      'en',
      'map'
    ).archive;
    const chart = new Interactive(
      pack,
      'dist/embeds/en/chart/index.html',
      'en',
      'chart'
    ).archive;

    expect((await map.collectMetadata()).title).toBe('Map title');
    expect((await chart.collectMetadata()).title).toBe('Chart title');
  });

  it("points editionRoot at the archive's page directory", () => {
    const pack = new Pack();
    const map = new Interactive(
      pack,
      'dist/embeds/en/map/index.html',
      'en',
      'map'
    ).archive;

    expect(map.editionRoot.endsWith('dist/embeds/en/map')).toBe(true);
  });
});

describe('archive metadata phases', () => {
  it('collects metadata without reserving a URL', async () => {
    // Collecting used to reserve the archive's URL inline, which is what put a
    // prompt in the middle of a long upload. There's no server client here, so a
    // reservation attempt would throw.
    const pack = new Pack();
    pack.metadata.title = 'Pack title:';
    pack.metadata.description = 'Pack desc:';
    const map = new Interactive(
      pack,
      'dist/embeds/en/map/index.html',
      'en',
      'map'
    ).archive;

    const metadata = await map.collectMetadata();

    expect(metadata.embed).toBeUndefined();
  });

  it('renders the embed code once a URL exists', () => {
    const pack = new Pack();
    const map = new Interactive(
      pack,
      'dist/embeds/en/map/index.html',
      'en',
      'map'
    ).archive;

    const metadata = map.setEmbedMetadata(
      'https://www.reuters.com/graphics/my-graphic/wild/abc123'
    );

    expect(metadata.embed?.declaration).toContain('media-en-map');
    expect(metadata.embed?.declaration).toContain('abc123');
  });
});
