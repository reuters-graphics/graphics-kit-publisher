import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setProject } from '../__test__/project';
import { Pack } from '.';
import { getServerClient } from '../server/client';

vi.mock('../server/client', () => ({ getServerClient: vi.fn() }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Pack.ensurePackId', () => {
  it('does nothing when the project already has a pack ID', async () => {
    // The claim the single interactive phase rests on: for any project uploaded
    // before, making sure a pack exists costs no server call and no prompt, so
    // pack metadata doesn't have to be collected ahead of the build.
    setProject({
      'package.json': JSON.stringify({
        reuters: { graphic: { pack: 'existing-pack-id' } },
      }),
    });

    const packId = await new Pack().ensurePackId();

    expect(packId).toBe('existing-pack-id');
    expect(getServerClient).not.toHaveBeenCalled();
  });

  it('creates the pack when there is no ID yet', async () => {
    // Only a first-ever upload takes this path, because the ID has to exist
    // before the build: it's baked into the separate-assets download URL.
    setProject({
      'package.json': JSON.stringify({
        reuters: {
          graphic: {
            desk: 'london',
            language: 'en',
            title: 'A graphic title',
            description: 'A description',
            contactEmail: 'someone@thomsonreuters.com',
            slugs: { root: 'MY-GRAPHIC', wild: 'WILD' },
            authors: [
              { name: 'Someone', link: 'https://www.reuters.com/authors/x/' },
            ],
          },
        },
      }),
    });

    vi.mocked(getServerClient).mockReturnValue({
      createGraphic: vi.fn(),
      updateGraphic: vi.fn(),
      pack: { graphic: { id: 'newly-created-id' } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const packId = await new Pack().ensurePackId();

    expect(packId).toBe('newly-created-id');
    expect(
      vi.mocked(getServerClient).mock.results[0].value.createGraphic
    ).toHaveBeenCalled();
    expect(
      vi.mocked(getServerClient).mock.results[0].value.updateGraphic
    ).not.toHaveBeenCalled();
  });
});
