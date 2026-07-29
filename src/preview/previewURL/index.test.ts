import { describe, it, beforeEach, expect } from 'vitest';
import { setProject } from '../../__test__/project';

import { getPreviewURL } from '.';
import { utils } from '@reuters-graphics/graphics-bin';

describe('getPreviewURL', () => {
  beforeEach(() => {
    // Write a fake project structure
    setProject({
      'package.json': JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        reuters: {},
      }),
    });
  });

  it('returns existing preview URL if present in package.json', () => {
    // Add an existing "reuters.preview" to the project's package.json
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
