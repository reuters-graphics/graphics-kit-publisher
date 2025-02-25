import type { RNGS } from '@reuters-graphics/server-client';
import { validateOrMessage, archiveEdition } from '../../validators';
import { context } from '../../context';
import * as prompts from '../../prompts';

export type ArchiveEditionsMetadata = {
  language: RNGS.Language;
  title: string;
  description: string;
  embed?: {
    declaration: string;
    dependencies: string;
  };
};

export const title = async (packTitleLength: number) =>
  prompts.getOrSetPkgText<string, string>(
    'reuters.graphic.title',
    context.config.metadataPointers.edition.title,
    {
      message: "What's the title for this graphic edition?",
      validate: (value) => {
        const maxArchiveTitleLength = 255 - packTitleLength;
        if (value.length >= maxArchiveTitleLength)
          return `Must be fewer than ${maxArchiveTitleLength} characters.`;
        return validateOrMessage(archiveEdition.Title, value);
      },
    }
  );

export const description = async (packDescriptionLength: number) =>
  prompts.getOrSetPkgText(
    'reuters.graphic.description',
    context.config.metadataPointers.edition.description,
    {
      message: "What's the description for this graphic edition?",
      validate: (value) => {
        const maxArchiveDescriptionLength = 255 - packDescriptionLength;
        if (value.length >= maxArchiveDescriptionLength)
          return `Must be fewer than ${maxArchiveDescriptionLength} characters.`;
        return validateOrMessage(archiveEdition.Description, value);
      },
    }
  );
