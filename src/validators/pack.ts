import * as v from 'valibot';

export const Pack = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.regex(
    /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$/,
    'Pack ID is invalid.'
  )
);

export const Desk = v.union(
  [
    v.literal('singapore'),
    v.literal('bengaluru'),
    v.literal('london'),
    v.literal('new york'),
  ],
  'Desk is not a valid option.'
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

export const Contact = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.email('Contact email is invalid.'),
  v.endsWith(
    '@thomsonreuters.com',
    'Contact email must be a Thomson Reuters address.'
  )
);

export const RootSlug = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.regex(
    /^([A-Z0-9&.'])(\s?[A-Z0-9&.'])+(-[A-Z0-9&.'](\s?[A-Z0-9&.'])+){1,4}$/,
    'Root slug is invalid.'
  )
);

export const WildSlug = v.pipe(
  v.string(),
  v.trim(),
  v.regex(
    /^[A-Za-z0-9&. \s\-']*(\s?\([A-Z0-9&]+(,\s[A-Z0-9&]+)*\))?$/,
    'Wild slug is invalid.'
  )
);

const AuthorName = v.pipe(v.string(), v.trim(), v.nonEmpty(), v.minLength(3));

export const AuthorLink = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.url('Author link must be a valid URL.')
);

export const Authors = v.array(
  v.required(
    v.strictObject({
      name: AuthorName,
      link: AuthorLink,
    }),
    'Author must have a name and a valid link.'
  )
);

const Byline = v.pipe(v.string(), v.trim(), v.nonEmpty(), v.minLength(3));

export const Title = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.length(3, 'Title must be at least 3 characters'),
  v.maxLength(150, 'Description must be less than 150 characters')
);

export const Description = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.length(3, 'Description must be at least 3 characters'),
  v.maxLength(150, 'Description must be less than 150 characters')
);

export const Metadata = v.required(
  v.object({
    id: v.optional(Pack),
    desk: Desk,
    rootSlug: RootSlug,
    wildSlug: WildSlug,
    language: Language,
    title: Title,
    description: Description,
    byline: Byline,
    contactEmail: Contact,
  })
);
