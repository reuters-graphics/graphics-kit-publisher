import { describe, it, expect } from 'vitest';

import { validateOrThrow } from '.';
import * as archive from './archive';

describe('archive validators', () => {
  it('should validate url', () => {
    expect(() => {
      validateOrThrow(
        archive.Url,
        'https://www.reuters.com/graphics/FOOTBALL-NFL-SUPERBOWL/MAHOMES/akpeebbagpr/'
      );
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Url, 'invalid');
    }).toThrowError('URL must be valid.');

    expect(() => {
      validateOrThrow(
        archive.Url,
        'https://www.bloomberg.com/graphics/2025-trump-token-memecoin-crypto-finance/'
      );
    }).toThrowError('URL must be a reuters.com link');
  });

  it('should validate slug', () => {
    expect(() => {
      validateOrThrow(archive.Slug, 'media-en-interactive');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Slug, 'invalid slug');
    }).toThrowError('Slug is invalid.');
  });

  it('should validate language', () => {
    expect(() => {
      validateOrThrow(archive.Language, 'ar');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Language, 'zh');
    }).toThrowError('Language is not a valid option.');
  });

  it('should validate title', () => {
    expect(() => {
      validateOrThrow(archive.Title, 'A title');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Title, '');
    }).toThrowError('3 characters');
  });

  it('should validate description', () => {
    expect(() => {
      validateOrThrow(archive.Description, 'A description');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Description, '');
    }).not.toThrowError();
  });

  it('should keep embed metadata through validation', () => {
    // https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
    // `embed` used to be missing from this schema, so valibot's default
    // key-stripping silently dropped it from validateOrThrow's output —
    // which is the object actually sent to the server.
    const metadata = {
      language: 'en',
      title: 'A title',
      description: 'A description',
      embed: {
        declaration: '<div data-embed-slug="foo"></div>',
        dependencies: '<script src="foo.js"></script>',
      },
    };

    expect(validateOrThrow(archive.Metadata, metadata)).toEqual(metadata);
  });

  it('should validate embed without requiring it', () => {
    expect(() => {
      validateOrThrow(archive.Metadata, {
        language: 'en',
        title: 'A title',
        description: 'A description',
      });
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Metadata, {
        language: 'en',
        title: 'A title',
        description: 'A description',
        embed: { declaration: 'missing dependencies' },
      });
    }).toThrowError();
  });

  it('should validate editions', () => {
    expect(() => {
      validateOrThrow(archive.Editions, [
        'interactive',
        'media-interactive',
        'JPG',
      ]);
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(archive.Editions, [
        'interactive',
        'media-interactive',
        'INVALID',
      ]);
    }).toThrowError();
  });
});
