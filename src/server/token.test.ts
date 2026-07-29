import { describe, it, expect, beforeEach, vi } from 'vitest';

import { setProject } from '../__test__/project';
import { Token } from './token';

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

/** A decodable JWT carrying `rights`, which is all `validateToken` reads. */
const jwt = (rights: string[]) => {
  const payload = Buffer.from(JSON.stringify({ rights })).toString('base64url');
  return `${Buffer.from('{"alg":"none"}').toString('base64url')}.${payload}.sig`;
};

const token = () =>
  new Token({ username: 'u', password: 'p', apiKey: 'k'.repeat(22) });

beforeEach(() => {
  vi.clearAllMocks();
  setProject({});
});

describe('Token.validateToken', () => {
  it('accepts a token with graphics-server rights', async () => {
    await expect(token().validateToken(jwt(['GFX_PUBLISH']))).resolves.toBe(
      jwt(['GFX_PUBLISH'])
    );
  });

  it('fails in CI rather than asking for a pasted token', async () => {
    // There's nobody to paste one, and the prompt doesn't degrade: with stdin
    // closed it renders and never resolves, so without this the job would run
    // to its timeout with a paste prompt as the last line in the log.
    vi.mocked(utils.environment.isCiEnvironment).mockReturnValue(true);

    await expect(
      token().validateToken(jwt(['SOME_OTHER_RIGHT']))
    ).rejects.toThrowError(/credentials were rejected, or lack the rights/);
  });

  it('names the environment variables to check', async () => {
    vi.mocked(utils.environment.isCiEnvironment).mockReturnValue(true);

    let thrown: Error | undefined;
    try {
      await token().validateToken(jwt([]));
    } catch (error) {
      thrown = error as Error;
    }

    // `rights: []` is falsy-empty rather than missing, so this reaches the
    // prompt path too.
    expect(JSON.stringify(thrown)).toContain('GRAPHICS_SERVER_API_KEY');
    expect(JSON.stringify(thrown)).toContain('API_TOKEN_UNAVAILABLE_IN_CI');
  });

  it('still throws its own error for an undecodable token', async () => {
    vi.mocked(utils.environment.isCiEnvironment).mockReturnValue(true);

    await expect(token().validateToken('not-a-jwt')).rejects.toThrowError(
      "Couldn't decode the provided token"
    );
  });
});
