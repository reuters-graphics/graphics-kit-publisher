import fs from 'node:fs';
import path from 'node:path';
import type { Config } from './types';
import { createJiti, type Jiti } from 'jiti';
import { pathToFileURL } from 'node:url';
import { FileNotFoundError, FileSystemError } from '../exceptions/errors';
import { context } from '../context';

const __dirname = import.meta.dirname;

/**
 * Loads user defined config from `publisher.config.ts` file in project root
 * and attaches merged config to context singleton.
 */
export const loadUserConfig = async () => {
  const pkgPath = path.resolve(process.cwd(), 'package.json');
  const configPath = path.resolve(process.cwd(), 'publisher.config.ts');

  if (!fs.existsSync(pkgPath)) {
    throw new FileSystemError(
      `Could not find "package.json" in ${process.cwd()}.`,
      {
        code: 'NOT_PROJECT_ROOT',
        hint: 'Run the publisher from the root of your project (where package.json lives).',
        context: { cwd: process.cwd() },
      }
    );
  }

  if (!fs.existsSync(configPath)) {
    throw new FileNotFoundError(
      `Could not find "publisher.config.ts" in ${process.cwd()}`,
      {
        code: 'MISSING_PUBLISHER_CONFIG',
        hint: 'Add a publisher.config.ts to your project root (see the publisher docs / `defineConfig`).',
        context: { configPath },
      }
    );
  }

  const configFileURL = pathToFileURL(configPath).toString();

  let jiti: Jiti;

  // Alias the library and disable caching for testing
  // using mocked filesystem
  if (process.env.VITEST && process.env.MOCK_FS) {
    jiti = createJiti(import.meta.url, {
      alias: {
        '@reuters-graphics/graphics-kit-publisher': path.join(
          __dirname,
          'index.ts'
        ),
      },
      fsCache: false,
      moduleCache: false,
    });
  } else {
    jiti = createJiti(import.meta.url);
  }

  const configModule = (await jiti.import(configFileURL, {
    default: true,
  })) as Config;

  context.config = configModule;

  return configModule;
};
