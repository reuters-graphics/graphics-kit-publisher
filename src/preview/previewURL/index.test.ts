import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import mockFs from 'mock-fs';

import { getPreviewURL } from '.';
import { utils } from '@reuters-graphics/graphics-bin';

describe('getPreviewURL', () => {
  beforeEach(() => {
    // Mock a fake project structure
    mockFs({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        reuters: {},
      }),
    });
  });

  afterEach(() => {
    // Restore original file system and working directory
    mockFs.restore();
  });

  it('returns existing preview URL if present in package.json', () => {
    // Overwrite the mock package.json to include an existing "reuters.preview"
    const existingPreviewUrl = 'https://example.org/preview-url/';
    utils.setPkgProp('reuters.preview', existingPreviewUrl);

    const result = getPreviewURL();
    expect(result).toBe(existingPreviewUrl);

    // Verify that it did NOT get overwritten
    expect(utils.getPkgProp('reuters.preview')).toBe(existingPreviewUrl);
  });

  it('generates a new preview URL if none is present', () => {
    expect(utils.getPkgProp('reuters.preview')).toBeUndefined(); // no preview property initially

    const result = getPreviewURL();

    // The result should be the newly set preview URL
    expect(result).toMatch(/^https?:\/\//); // Simple check that it's a URL
    // You can optionally check the year and path structure:
    const currentYear = new Date().getFullYear().toString();
    expect(result).toContain(`/testfiles/${currentYear}/`);

    // Confirm it was saved to package.json
    expect(utils.getPkgProp('reuters.preview')).toBe(result);
  });
});
