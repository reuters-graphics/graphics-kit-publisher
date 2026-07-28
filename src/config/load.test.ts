import { describe, it, expect, beforeEach } from 'vitest';
import dedent from 'dedent';
import fs from 'fs';
import { loadUserConfig } from './load';
import { resetProject, writeProject } from '../__test__/project';

beforeEach(() => {
  resetProject();
});

describe('Config load', () => {
  it('should load a valid config file', async () => {
    writeProject({
      'publisher.config.ts': dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

      export default defineConfig({
        packLocations: {
          dotcom: 'pages/',
        },
        metadataPointers: {
          pack: {
            title: 'locales/en/content.json?story.seoTitle',
            byline: {
              path: 'locales/en/content.json?story.authors',
              format: (value: string[]) => value.join(', '),
            },
          },
        },
      });`,
    });

    const config = await loadUserConfig();
    expect(config.packLocations.dotcom).toBe('pages/'); // User defined
    expect(config.packLocations.embeds).toBe('dist/embeds/{locale}/{slug}/'); // Default
  });

  it('should error on an invalid config file', async () => {
    writeProject({
      'publisher.config.ts': dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

      export default defineConfig({
        packLocations: {
          dotcom: 2,
        },
      });`,
    });

    await expect(() => loadUserConfig()).rejects.toThrowError('Invalid type');

    writeProject({
      'publisher.config.ts': dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

      export default defineConfig({
        packLocations: {
          dotcom: 'pages/',
        },
        metadataPointers: {
          pack: {
            byline: {
              path: 'locales/en/content.json',
            },
          },
        },
      });`,
    });

    await expect(() => loadUserConfig()).rejects.toThrowError(
      'metadataPointers.pack.byline.path Pointer should be a path like'
    );
  });

  it('should error on malformed config file', async () => {
    writeProject({
      'publisher.config.ts': dedent`export default {
        packLocations: {
          dotcom: 'dist/',
        },
      };`,
    });

    await expect(() => loadUserConfig()).rejects.toThrowError('Invalid');

    writeProject({
      'publisher.config.ts': dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';

      export const config = defineConfig({
        packLocations: {
          dotcom: 'dist/',
        },
      });`,
    });

    await expect(() => loadUserConfig()).rejects.toThrowError('Invalid');
  });

  it('should error without a config file', async () => {
    await expect(() => loadUserConfig()).rejects.toThrowError(
      'Could not find "publisher.config.ts"'
    );
  });

  it('should error if not run from project root', async () => {
    fs.rmSync('package.json');
    await expect(() => loadUserConfig()).rejects.toThrowError(
      'Could not find "package.json"'
    );
  });
});
