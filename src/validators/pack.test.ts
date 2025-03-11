import { describe, it, expect } from 'vitest';

import { validateOrThrow } from '.';
import * as pack from './pack';

describe('pack validators', () => {
  it('should validate pack', () => {
    expect(() => {
      validateOrThrow(pack.Pack, '6d3aec24-889d-40b0-b3c8-283a13a1d282');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Pack, 'invalid');
    }).toThrowError('Pack ID is invalid.');
  });

  it('should validate desk', () => {
    expect(() => {
      validateOrThrow(pack.Desk, 'london');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Desk, 'los angeles');
    }).toThrowError('Desk is not a valid option.');
  });

  it('should validate language', () => {
    expect(() => {
      validateOrThrow(pack.Language, 'ar');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Language, 'zh');
    }).toThrowError('Language is not a valid option.');
  });

  it('should validate contact', () => {
    expect(() => {
      validateOrThrow(pack.Contact, 'jane.dow@thomsonreuters.com');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Contact, 'jane.doe');
    }).toThrowError('Contact email is invalid.');

    expect(() => {
      validateOrThrow(pack.Contact, 'jane.doe@gmail.com');
    }).toThrowError('Contact email must be a Thomson Reuters address.');
  });

  it('should validate root slug', () => {
    expect(() => {
      validateOrThrow(pack.RootSlug, 'HEALTH-CORONAVIRUS');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.RootSlug, 'SRI LANKA-CRISIS');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.RootSlug, 'NEW ZEALAND-WEATHER-WATCHER');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.RootSlug, 'lower-case');
    }).toThrowError('Root slug is invalid.');

    expect(() => {
      validateOrThrow(pack.RootSlug, 'INVALID');
    }).toThrowError('Root slug is invalid.');
  });

  it('should validate wild slug', () => {
    expect(() => {
      validateOrThrow(pack.WildSlug, 'MAP');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.WildSlug, 'AMERICA-WEATHER');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.WildSlug, '!INVALID');
    }).toThrowError('Wild slug is invalid.');
  });

  it('should validate authors', () => {
    expect(() => {
      validateOrThrow(pack.Authors, [
        { name: 'Jane Doe', link: 'https://www.reuters.com/authors/jane-doe/' },
        { name: 'John Doe', link: 'https://www.reuters.com/authors/john-doe/' },
      ]);
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Authors, [
        { name: 'Jane Doe', link: 'invalid-link' },
        { name: 'John Doe', link: 'https://www.reuters.com/authors/john-doe/' },
      ]);
    }).toThrowError('Author link must be a valid URL');

    expect(() => {
      validateOrThrow(pack.Authors, [
        { name: 'Jane Doe', link: undefined },
        { name: 'John Doe', link: 'https://www.reuters.com/authors/john-doe/' },
      ]);
    }).toThrowError('Author must have a name and a valid link.');

    expect(() => {
      validateOrThrow(pack.Authors, [
        { name: 'Jane Doe', url: 'https://www.reuters.com/authors/jane-doe/' },
        { name: 'John Doe', link: 'https://www.reuters.com/authors/john-doe/' },
      ]);
    }).toThrowError('Expected "link"');
  });

  it('should validate pack title', () => {
    expect(() => {
      validateOrThrow(pack.Title, 'Coronavirus in the US');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Title, '');
    }).toThrowError('Title is required');

    expect(() => {
      validateOrThrow(pack.Title, 'a');
    }).toThrowError('3 characters');
  });

  it('should validate pack description', () => {
    expect(() => {
      validateOrThrow(pack.Description, 'Coronavirus in the US');
    }).not.toThrowError();

    expect(() => {
      validateOrThrow(pack.Description, '');
    }).toThrowError('Description is required');

    expect(() => {
      validateOrThrow(pack.Description, 'a');
    }).toThrowError('3 characters');
  });
});
