import type { RNGS, Graphic } from '@reuters-graphics/server-client';
import { context } from '../context';
import * as prompts from '../prompts';
import { isValid, pack, validateOrMessage } from '../validators';
import { utils } from '@reuters-graphics/graphics-bin';
import slugify from 'slugify';
import ordinal from 'ordinal';

export type PackMetadata = {
  id?: string;
  desk: Graphic.Desk;
  rootSlug: string;
  wildSlug: string;
  language: RNGS.Language;
  title: string;
  description: string;
  byline: string;
  contactEmail: string;
};

export const rootSlug = async () =>
  prompts.getOrSetPkgText(
    'reuters.graphic.slugs.root',
    context.config.metadataPointers.pack.rootSlug,
    {
      message:
        "What's the root slug for this graphic pack, i.e., a generic topic slug?",
      validate: (value) => validateOrMessage(pack.RootSlug, value),
    }
  );

export const wildSlug = async () =>
  prompts.getOrSetPkgText(
    'reuters.graphic.slugs.wild',
    context.config.metadataPointers.pack.wildSlug,
    {
      message:
        "What's the wild slug for this graphic pack, i.e., a more specific page slug?",
      validate: (value) => validateOrMessage(pack.WildSlug, value),
    }
  );

export const title = async () =>
  prompts.getOrSetPkgText<string, string>(
    'reuters.graphic.title',
    context.config.metadataPointers.pack.title,
    {
      message: "What's the title for this graphic pack?",
      validate: (value) => validateOrMessage(pack.Title, value),
    }
  );

export const description = async () =>
  prompts.getOrSetPkgText(
    'reuters.graphic.description',
    context.config.metadataPointers.pack.description,
    {
      message: "What's the description for this graphic pack?",
      validate: (value) => validateOrMessage(pack.Description, value),
    }
  );

export const desk = async () =>
  prompts.getOrSetPkgTextSelect(
    'reuters.graphic.desk',
    context.config.metadataPointers.pack.desk,
    {
      message: 'What desk is publishing this graphic?',
      options: [
        { value: 'bengaluru', label: 'Bengaluru' },
        { value: 'london', label: 'London' },
        { value: 'new york', label: 'New York' },
        { value: 'singapore', label: 'Singapore' },
      ],
    }
  );

export const contactEmail = async () =>
  prompts.getOrSetPkgText(
    'reuters.graphic.contactEmail',
    context.config.metadataPointers.pack.contactEmail,
    {
      message: "What's the contact author's email?",
      validate: (value) => validateOrMessage(pack.Contact, value),
    }
  );

export const language = async () =>
  prompts.getOrSetPkgTextSelect(
    'reuters.graphic.language',
    context.config.metadataPointers.pack.language,
    {
      message: "What's the language for this graphic pack?",
      initialValue: 'en',
      options: [
        { value: 'en', label: 'English' },
        { value: 'ar', label: 'Arabic' },
        { value: 'fr', label: 'French' },
        { value: 'es', label: 'Spanish' },
        { value: 'de', label: 'German' },
        { value: 'it', label: 'Italian' },
        { value: 'ja', label: 'Japanese' },
        { value: 'pt', label: 'Portugese' },
        { value: 'ru', label: 'Russian' },
      ],
    }
  );

const promptAuthor = async (authors: { name: string; link: string }[] = []) => {
  const name = await prompts.text({
    message: `What's the ${ordinal(authors.length + 1)} author's name?`,
  });
  const link = await prompts.text({
    message: `What's the link to ${name}'s author page?`,
    initialValue: `https://www.reuters.com/authors/${slugify(name.trim(), { lower: true })}/`,
    validate: (value: string) => {
      if (!isValid(pack.AuthorLink, value)) return 'Must be a valid URL';
    },
  });
  authors.push({ name, link });

  const addMore = await prompts.confirm({
    message: 'Any more to add?',
    initialValue: false,
  });

  if (addMore) return promptAuthor(authors);
  return authors;
};

const promptAuthors = async () => {
  const authors = await promptAuthor();
  utils.setPkgProp('reuters.graphic.authors', authors);
  return authors.map((d) => d.name).join(', ');
};

export const byline = async () => {
  const existingAuthors = utils.getPkgProp('reuters.graphic.authors') as
    | { name: string; link: string }[]
    | undefined;
  if (existingAuthors) return existingAuthors.map((d) => d.name).join(', ');
  const pointerValue = utils.fs.get(
    context.config.metadataPointers.pack.byline
  ) as string[] | undefined;
  if (!pointerValue) return promptAuthors();
  const authors = pointerValue.map((name) => ({
    name,
    link: `https://www.reuters.com/authors/${slugify(name.trim(), { lower: true })}/`,
  }));
  if (!isValid(pack.Authors, authors)) return promptAuthors();
  utils.setPkgProp('reuters.graphic.authors', authors);
  return authors.map((d) => d.name).join(', ');
};
