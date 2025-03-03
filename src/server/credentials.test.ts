import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import path from 'path';
import os from 'os';

import { getServerCredentials } from './credentials';
import { ServerCredentialsError, UserConfigError } from '../exceptions/errors';
import { utils } from '@reuters-graphics/graphics-bin';

vi.mock('@reuters-graphics/graphics-bin', async () => {
  const actual = await vi.importActual('@reuters-graphics/graphics-bin');
  return {
    ...actual,
    utils: {
      environment: {
        isCiEnvironment: vi.fn(),
      },
    },
  };
});

describe('getServerCredentials', () => {
  const homeDir = '/fake-home';

  beforeEach(() => {
    // Mock the home directory so that `~/.reuters-graphics` goes to our fake directory
    vi.spyOn(os, 'homedir').mockReturnValue(homeDir);
  });

  afterEach(() => {
    // Restore all mocks and reset the mocked filesystem
    vi.restoreAllMocks();
    mockFs.restore();
  });

  it('throws UserConfigError if the credentials file does not exist', () => {
    mockFs({
      // No ~/.reuters-graphics folder
    });

    expect(() => getServerCredentials()).toThrowError(UserConfigError);
  });

  it('loads credentials from file when it exists (non-CI environment)', () => {
    // Provide a valid mock credentials file
    const validCreds = {
      username: 'validUser',
      password: 'validPass',
      apiKey: '1234567890abcdefghijkl', // length 20
    };

    mockFs({
      [path.join(homeDir, '.reuters-graphics')]: {
        'graphics-server.json': JSON.stringify(validCreds),
      },
    });

    const result = getServerCredentials();
    expect(result).toEqual(validCreds);
  });

  it('throws ServerCredentialsError if credentials in file are invalid', () => {
    // Invalid credential file: short apiKey
    const invalidCreds = {
      username: 'validUser',
      password: 'validPass',
      apiKey: 'shortKey',
    };

    mockFs({
      [path.join(homeDir, '.reuters-graphics')]: {
        'graphics-server.json': JSON.stringify(invalidCreds),
      },
    });

    expect(() => getServerCredentials()).toThrowError(ServerCredentialsError);
  });

  it('uses environment variables if in CI environment', () => {
    // Make isCiEnvironment return true
    vi.spyOn(utils.environment, 'isCiEnvironment').mockReturnValue(true);

    // Mock environment variables
    process.env.GRAPHICS_SERVER_USERNAME = 'envUser';
    process.env.GRAPHICS_SERVER_PASSWORD = 'envPassword';
    process.env.GRAPHICS_SERVER_API_KEY = '1234567890abcdefghijkl';

    const creds = getServerCredentials();

    expect(creds).toEqual({
      username: 'envUser',
      password: 'envPassword',
      apiKey: '1234567890abcdefghijkl',
    });
  });

  it('throws ServerCredentialsError when CI env variables are missing or invalid', () => {
    // Make isCiEnvironment return true
    vi.spyOn(utils.environment, 'isCiEnvironment').mockReturnValue(true);

    // Provide bad or missing environment variables
    process.env.GRAPHICS_SERVER_USERNAME = 'ok';
    process.env.GRAPHICS_SERVER_PASSWORD = 'ok';
    process.env.GRAPHICS_SERVER_API_KEY = 'too_short'; // < 20 chars

    expect(() => getServerCredentials()).toThrowError(ServerCredentialsError);
  });
});
