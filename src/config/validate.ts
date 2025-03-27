import * as v from 'valibot';
import type { Config } from './types';
import { ConfigError } from '../exceptions/errors';

const mediaEditionLocation = v.union([
  v.literal(false),
  v.pipe(
    v.string(),
    v.nonEmpty(),
    v.includes('{locale}', 'Path must include "{locale}" capture group'),
    v.includes('{slug}', 'Path must include "{slug}" capture group')
  ),
]);

const optionalPointer = v.union([
  v.literal(false),
  v.pipe(
    v.string(),
    v.nonEmpty(),
    v.includes('?', 'Pointer should be a path like "dist/index.html?title"')
  ),
  v.object({
    path: v.pipe(
      v.string(),
      v.nonEmpty(),
      v.includes('?', 'Pointer should be a path like "dist/index.html?title"')
    ),
    format: v.optional(v.function()),
    validate: v.optional(v.function()),
    promptAsInitial: v.optional(v.boolean()),
  }),
]);

const Locale = {
  en: 'en',
  ar: 'ar',
  fr: 'fr',
  es: 'es',
  de: 'de',
  it: 'it',
  ja: 'ja',
  pt: 'pt',
  ru: 'ru',
} as const;

const Regex = v.custom((input) => input instanceof RegExp);

const ConfigSchema = v.required(
  v.object({
    build: v.required(
      v.object({
        scripts: v.required(
          v.object({
            production: v.string(),
            preview: v.string(),
          })
        ),
        outDir: v.string(),
      })
    ),
    packLocations: v.required(
      v.object({
        dotcom: v.union([v.literal(false), v.pipe(v.string(), v.nonEmpty())]),
        embeds: mediaEditionLocation,
        statics: mediaEditionLocation,
      })
    ),
    metadataPointers: v.required(
      v.object({
        pack: v.required(
          v.object({
            rootSlug: optionalPointer,
            wildSlug: optionalPointer,
            desk: optionalPointer,
            byline: optionalPointer,
            contactEmail: optionalPointer,
            language: v.union([v.enum(Locale), optionalPointer]),
            title: optionalPointer,
          })
        ),
        edition: v.required(
          v.object({
            title: optionalPointer,
            description: optionalPointer,
          })
        ),
      })
    ),
    archiveEditions: v.required(
      v.object({
        docs: v.record(v.string(), v.union([v.string(), v.function()])),
      })
    ),
    embedTemplate: v.required(
      v.object({
        declaration: v.function(),
        dependencies: v.function(),
      })
    ),
    publishingLocations: v.array(
      v.object({
        archive: v.union([v.string(), Regex]),
        availableLocations: v.required(
          v.object({
            lynx: v.boolean(),
            connect: v.boolean(),
          })
        ),
      })
    ),
  })
);

export const validateConfig = (config: Config) => {
  try {
    v.parse(ConfigSchema, config);
  } catch (err: unknown) {
    if (v.isValiError(err)) {
      const errorMessages: string[] = [];
      for (const e of err.issues) {
        const dotPath = v.getDotPath(e);
        errorMessages.push(`${dotPath} ${e.message}`);
      }
      throw new ConfigError(errorMessages.join('\n'));
    }
    throw new ConfigError('unknown config error');
  }
  return;
};
