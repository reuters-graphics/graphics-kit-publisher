import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import mockFs from 'mock-fs';

import { context } from '../context';
import { getLynxOptions, getConnectOptions } from './publishOptions';

describe('Edition options module', () => {
  beforeEach(() => {
    mockFs({
      './package.json': JSON.stringify({
        reuters: {
          graphic: {
            archives: {
              public: {
                editions: ['interactive'],
              },
              'media-en-page': {
                editions: ['interactive', 'media-interactive'],
              },
              'media-en-map': {
                editions: ['media-interactive', 'PDF'],
              },
              'media-de-map': {
                editions: ['PNG', 'EPS'],
              },
            },
          },
        },
      }),
    });

    context.config.publishingLocations = [
      {
        archive: 'public',
        availableLocations: {
          lynx: false,
          connect: false,
        },
      },
      {
        archive: 'media-en-map',
        availableLocations: {
          lynx: false,
          connect: true,
        },
      },
      {
        archive: /.+-de-.+/,
        availableLocations: {
          lynx: true,
          connect: false,
        },
      },
    ];
  });

  afterEach(() => {
    mockFs.restore();
  });

  describe('getLynxOptions()', () => {
    it('includes only archives that have Lynx-eligible editions and whose publishingLocations.lynx is true', () => {
      const result = getLynxOptions();
      expect(result).toEqual([
        ['media-en-page.zip', 'interactive'],
        ['media-de-map.zip', 'PNG'],
      ]);
    });

    it('excludes archives that either do not have Lynx-eligible editions or have lynx=false in config', () => {
      const result = getLynxOptions();
      const hasArchiveB = result.some(
        ([filename]) => filename === 'media-en-map.zip'
      );
      expect(hasArchiveB).toBe(false);
    });
  });

  describe('getConnectOptions()', () => {
    it('includes only archives that have Connect-eligible editions and whose publishingLocations.connect is true', () => {
      const result = getConnectOptions();
      expect(result).toEqual([
        ['media-en-page.zip', 'media-interactive'],
        ['media-en-map.zip', 'media-interactive'],
        ['media-en-map.zip', 'PDF'],
      ]);
    });

    it('excludes archives that do not match the Connect filter or have connect=false', () => {
      const result = getConnectOptions();
      const hasArchiveA = result.some(
        ([filename]) => filename === 'media-de-map.zip'
      );
      expect(hasArchiveA).toBe(false);
    });
  });
});
