import type { RNGS } from '@reuters-graphics/server-client';
import { validateOrMessage, archiveEdition } from '../../validators';
import { context } from '../../context';
import * as prompts from '../../prompts';
import type { Archive } from '.';
import picocolors from 'picocolors';
import { PKG } from '../../pkg';

export type ArchiveEditionsMetadata = {
  language: RNGS.Language;
  title: string;
  description: string;
  embed?: {
    declaration: string;
    dependencies: string;
  };
};

export const title = async (archive: Archive) =>
  prompts.getOrSetPkgText<string, string>(
    PKG.dotPaths.archives.title(archive.id),
    context.config.metadataPointers.edition.title,
    {
      message: `What's the title for the ${picocolors.cyan(archive.id)} archive?`,
      validate: (value) => {
        const maxArchiveTitleLength = 255 - archive.pack.metadata.title!.length;
        if (value.length >= maxArchiveTitleLength)
          return `Must be fewer than ${maxArchiveTitleLength} characters.`;
        return validateOrMessage(archiveEdition.Title, value);
      },
    }
  );

export const description = async (archive: Archive) =>
  prompts.getOrSetPkgText(
    PKG.dotPaths.archives.description(archive.id),
    context.config.metadataPointers.edition.description,
    {
      message: `What's the description for the ${picocolors.cyan(archive.id)} archive?`,
      validate: (value) => {
        const maxArchiveDescriptionLength =
          255 - archive.pack.metadata.description!.length;
        if (value.length >= maxArchiveDescriptionLength)
          return `Must be fewer than ${maxArchiveDescriptionLength} characters.`;
        return validateOrMessage(archiveEdition.Description, value);
      },
    }
  );
