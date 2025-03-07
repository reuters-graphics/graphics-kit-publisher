import mock from 'mock-fs';
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import path from 'path';
import dedent from 'dedent';
import fs from 'fs';
import { loadUserConfig } from './load';
import { mockedNodeModules } from '../__test__/utils';

const CONFIG_PATH = path.join(process.cwd(), 'publisher.config.ts');
const CWD = process.cwd();

beforeEach(() => {
  process.env.MOCK_FS = 'T';
  mock({
    ...mockedNodeModules,
    [path.join(CWD, 'src/')]: mock.load(path.join(CWD, 'src/')),
    'package.json': '{}',
  });
});

afterEach(() => {
  delete process.env.MOCK_FS;
  mock.restore();
});

describe('Config load', () => {
  it('should load a valid config file', async () => {
    fs.writeFileSync(
      CONFIG_PATH,
      dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
    
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
      });`
    );

    const config = await loadUserConfig();
    expect(config.packLocations.dotcom).toBe('pages/'); // User defined
    expect(config.packLocations.embeds).toBe('dist/embeds/{locale}/{slug}/'); // Default
  });

  it('should error on an invalid config file', async () => {
    fs.writeFileSync(
      CONFIG_PATH,
      dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
    
      export default defineConfig({
        packLocations: {
          dotcom: 2,
        },
      });`
    );

    await expect(() => loadUserConfig()).rejects.toThrowError('Invalid type');

    fs.writeFileSync(
      CONFIG_PATH,
      dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
    
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
      });`
    );

    await expect(() => loadUserConfig()).rejects.toThrowError(
      'metadataPointers.pack.byline.path Pointer should be a path like'
    );
  });

  it('should error on malformed config file', async () => {
    fs.writeFileSync(
      CONFIG_PATH,
      dedent`export default {
        packLocations: {
          dotcom: 'dist/',
        },
      };`
    );

    await expect(() => loadUserConfig()).rejects.toThrowError('Invalid');

    fs.writeFileSync(
      CONFIG_PATH,
      dedent`import { defineConfig } from '@reuters-graphics/graphics-kit-publisher';
    
      export const config = defineConfig({
        packLocations: {
          dotcom: 'dist/',
        },
      });`
    );

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
