import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setProject } from '../__test__/project';
import { Pack } from '.';
import { Interactive } from './edition/types/interactive';
import { JPG } from './edition/types/jpg';
import {
  archiveLabel,
  resolveArchiveIds,
  selectArchives,
  truncateMiddle,
} from './selection';

vi.mock('../prompts/groupMultiselect', () => ({
  groupMultiselect: vi.fn(),
}));
import { groupMultiselect } from '../prompts/groupMultiselect';

/**
 * Control the CI check rather than the environment it reads. Unsetting `CI`
 * isn't enough — GitHub Actions sets several variables that mark a CI
 * environment, so these tests took the CI path there and never reached the
 * prompt.
 */
vi.mock('@reuters-graphics/graphics-bin', async () => {
  const actual = await vi.importActual<
    typeof import('@reuters-graphics/graphics-bin')
  >('@reuters-graphics/graphics-bin');
  return {
    ...actual,
    utils: {
      ...actual.utils,
      environment: {
        ...actual.utils.environment,
        isCiEnvironment: vi.fn(() => false),
      },
    },
  };
});
import { utils } from '@reuters-graphics/graphics-bin';

const build = {
  'dist/index.html': '<html></html>',
  'dist/embeds/en/map/index.html': '<html></html>',
  'dist/embeds/en/chart/index.html': '<html></html>',
  'media-assets/en/map/graphic.jpg': '',
};

/** A pack with the public archive plus two embeds, as the finder would leave it. */
const discovered = () => {
  const pack = new Pack();
  new Interactive(pack, 'dist/index.html', 'en');
  new Interactive(pack, 'dist/embeds/en/map/index.html', 'en', 'map');
  new Interactive(pack, 'dist/embeds/en/chart/index.html', 'en', 'chart');
  return pack;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(utils.environment.isCiEnvironment).mockReturnValue(false);
  setProject({ ...build, 'package.json': '{}' });
});

describe('truncateMiddle', () => {
  it('leaves short labels alone', () => {
    expect(truncateMiddle('en-map')).toBe('en-map');
  });

  it('cuts the middle, keeping the locale and the distinguishing tail', () => {
    // Sibling embeds share long prefixes and differ at the end, so cutting the
    // tail would render these two identical.
    const map = truncateMiddle('en-israel-lebanon-border-strikes-map');
    const chart = truncateMiddle('en-israel-lebanon-border-strikes-chart');

    expect(map).not.toBe(chart);
    expect(map.startsWith('en-israel')).toBe(true);
    expect(map.endsWith('-map')).toBe(true);
    expect(chart.endsWith('-chart')).toBe(true);
    expect(map.length).toBeLessThanOrEqual(30);
  });
});

describe('archiveLabel', () => {
  it('drops the media prefix, which is on every embed', () => {
    expect(archiveLabel('media-en-map')).toBe('en-map');
  });

  it('leaves the public archive as it is', () => {
    expect(archiveLabel('public')).toBe('public');
  });
});

describe('resolveArchiveIds', () => {
  it('accepts canonical archive IDs', () => {
    expect(
      resolveArchiveIds(['public', 'media-en-map'], discovered().archives)
    ).toEqual(['public', 'media-en-map']);
  });

  it('accepts the shortened form the prompt displays', () => {
    // Whatever a user reads off the prompt should work when they script it.
    expect(resolveArchiveIds(['en-map'], discovered().archives)).toEqual([
      'media-en-map',
    ]);
  });

  it('ignores duplicates and blanks', () => {
    expect(
      resolveArchiveIds(['en-map', 'media-en-map', ''], discovered().archives)
    ).toEqual(['media-en-map']);
  });

  it('fails on an unknown archive, listing the real ones', () => {
    let thrown: Error | undefined;
    try {
      resolveArchiveIds(['en-mpa'], discovered().archives);
    } catch (error) {
      thrown = error as Error;
    }

    expect(thrown?.message).toContain('"en-mpa"');
    // The hint carries the available IDs, in canonical form.
    expect(JSON.stringify(thrown)).toContain('media-en-map');
  });
});

describe('selectArchives', () => {
  it('uses an explicit list without prompting', async () => {
    const pack = discovered();

    const selected = await selectArchives({
      archives: pack.archives,
      requested: ['en-map'],
    });

    expect(selected.map((a) => a.id)).toEqual(['media-en-map']);
    expect(groupMultiselect).not.toHaveBeenCalled();
  });

  it('uploads everything in CI, as it always has', async () => {
    vi.mocked(utils.environment.isCiEnvironment).mockReturnValue(true);
    const pack = discovered();

    const selected = await selectArchives({ archives: pack.archives });

    expect(selected).toHaveLength(3);
    expect(groupMultiselect).not.toHaveBeenCalled();
  });

  it("doesn't ask when there's only one archive to choose from", async () => {
    const pack = new Pack();
    new Interactive(pack, 'dist/index.html', 'en');

    const selected = await selectArchives({ archives: pack.archives });

    expect(selected).toHaveLength(1);
    expect(groupMultiselect).not.toHaveBeenCalled();
  });

  it('groups the prompt by what each archive publishes', async () => {
    const pack = discovered();
    vi.mocked(groupMultiselect).mockResolvedValue(['media-en-map']);

    const selected = await selectArchives({ archives: pack.archives });

    const options = vi.mocked(groupMultiselect).mock.calls[0][0].options;
    expect(Object.keys(options)).toEqual(['reuters.com', 'embeds']);
    expect(options['reuters.com'].map((o) => o.label)).toEqual(['public']);
    expect(options['embeds'].map((o) => o.label)).toEqual([
      'en-map',
      'en-chart',
    ]);
    expect(selected.map((a) => a.id)).toEqual(['media-en-map']);
  });

  it('preselects everything, so enter keeps the old behaviour', async () => {
    const pack = discovered();
    vi.mocked(groupMultiselect).mockResolvedValue([]);

    await selectArchives({ archives: pack.archives });

    expect(vi.mocked(groupMultiselect).mock.calls[0][0].initialValues).toEqual([
      'public',
      'media-en-map',
      'media-en-chart',
    ]);
  });

  it('hints whether each archive is new or an update', async () => {
    setProject({
      ...build,
      'package.json': JSON.stringify({
        reuters: {
          graphic: {
            archives: {
              'media-en-map': { uploaded: '2026-07-01T00:00:00.000Z' },
            },
          },
        },
      }),
    });
    const pack = discovered();
    vi.mocked(groupMultiselect).mockResolvedValue([]);

    await selectArchives({ archives: pack.archives });

    const options = vi.mocked(groupMultiselect).mock.calls[0][0].options;
    const hints = Object.fromEntries(
      options['embeds'].map((o) => [o.label, o.hint])
    );
    expect(hints['en-map']).toBe('updates existing');
    expect(hints['en-chart']).toBe('new');
  });

  it('can select a statics-only archive', async () => {
    // Archives without an interactive edition are selectable too — they're
    // uploaded, they just have no URL to reserve.
    const pack = new Pack();
    new Interactive(pack, 'dist/index.html', 'en');
    new JPG(pack, 'media-assets/en/map/graphic.jpg', 'en', 'map');

    const selected = await selectArchives({
      archives: pack.archives,
      requested: ['media-en-map'],
    });

    expect(selected.map((a) => a.id)).toEqual(['media-en-map']);
  });
});
