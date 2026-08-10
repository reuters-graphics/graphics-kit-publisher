import * as v from 'valibot';

export const Url = v.pipe(
  v.string(),
  v.nonEmpty(),
  v.url('URL must be valid.'),
  v.custom((value) => {
    if (typeof value !== 'string') return false;
    const url = new URL(value);
    return url.hostname === 'www.reuters.com';
  }, 'URL must be a reuters.com link.')
);

export const Slug = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug is invalid.')
);

export const Language = v.union(
  [
    v.literal('en'),
    v.literal('ar'),
    v.literal('fr'),
    v.literal('es'),
    v.literal('de'),
    v.literal('it'),
    v.literal('ja'),
    v.literal('pt'),
    v.literal('ru'),
  ],
  'Language is not a valid option.'
);

export const Title = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty('Title is required'),
  v.minLength(3, 'Title must be at least 3 characters.')
);

export const Description = v.pipe(v.string(), v.trim());

export const Editions = v.array(
  v.union([
    v.literal('interactive'),
    v.literal('media-interactive'),
    v.literal('PNG'),
    v.literal('JPG'),
    v.literal('PDF'),
    v.literal('EPS'),
  ])
);

export const Embed = v.object({
  declaration: v.string(),
  dependencies: v.string(),
});

/**
 * `embed` stays optional here — statics-only archives never get one — but it
 * must be declared or `validateOrThrow` strips it from its output object,
 * which is what `Archive.createOrUpdate` sends to the server.
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */
export const Metadata = v.required(
  v.object({
    language: Language,
    title: Title,
    description: Description,
    embed: v.optional(Embed),
  }),
  ['language', 'title', 'description']
);
