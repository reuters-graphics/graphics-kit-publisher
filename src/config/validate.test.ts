import { describe, it, expect } from 'vitest';
import { validateConfig } from './validate';
import { defaultConfig } from './index';
import { ConfigError } from '../exceptions/errors';

describe('validateConfig — ai key', () => {
  it('defaults to "prompt"', () => {
    expect(defaultConfig.ai).toBe('prompt');
  });

  it('accepts "prompt" and "off"', () => {
    expect(() =>
      validateConfig({ ...defaultConfig, ai: 'prompt' })
    ).not.toThrow();
    expect(() => validateConfig({ ...defaultConfig, ai: 'off' })).not.toThrow();
  });

  it('rejects any other value', () => {
    expect(() =>
      // @ts-expect-error — intentionally invalid value
      validateConfig({ ...defaultConfig, ai: 'sometimes' })
    ).toThrow(ConfigError);
  });
});
