import type { RNGS } from '@reuters-graphics/server-client';
import { validateOrMessage, archiveEdition } from '../../validators';
import { context } from '../../context';
import * as prompts from '../../prompts';
import { coerceToPointerWithOptions } from '../../prompts/utils';
import type { MetadataPointer } from '../../config/types';
import type { Archive } from '.';
import path from 'path';
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

/**
 * Resolve an `edition.*` pointer against the archive's own edition directory.
 *
 * These pointers are documented as relative to each edition's root — the
 * default `index.html?title` means *this archive's* page. Without rebasing they
 * resolve against the process's working directory instead, so every archive
 * would read the same project-root `index.html` (usually absent, so every
 * archive prompted instead).
 *
 * Absolute paths and `~` paths are left alone: those are explicit about where
 * they point.
 */
const forEdition = (
  pointer: MetadataPointer,
  archive: Archive
): MetadataPointer => {
  if (!pointer) return pointer;
  const { path: pointerPath, ...options } = coerceToPointerWithOptions(pointer);
  const [filePath, ...dataPath] = pointerPath.split('?');
  if (!filePath || path.isAbsolute(filePath) || filePath.startsWith('~'))
    return pointer;
  return {
    ...options,
    path: `${path.join(archive.editionRoot, filePath)}?${dataPath.join('?')}`,
  };
};

export const title = async (archive: Archive) =>
  prompts.getOrSetPkgText<string, string>(
    PKG.dotPaths.archives.title(archive.id),
    forEdition(context.config.metadataPointers.edition.title, archive),
    {
      message: `What's the title for the ${picocolors.cyan(archive.id)} archive (specific title of graphic)?`,
      validate: (value) => {
        const maxArchiveTitleLength = 255 - archive.pack.metadata.title!.length;
        if (value.length >= maxArchiveTitleLength)
          return `Must be fewer than ${maxArchiveTitleLength} characters.`;
        return validateOrMessage(archiveEdition.Title, value);
      },
      required: false,
    }
  );

export const description = async (archive: Archive) =>
  prompts.getOrSetPkgText(
    PKG.dotPaths.archives.description(archive.id),
    forEdition(context.config.metadataPointers.edition.description, archive),
    {
      message: `What's the description for the ${picocolors.cyan(archive.id)} archive (used as alt text)?`,
      validate: (value) => {
        const maxArchiveDescriptionLength =
          255 - archive.pack.metadata.description!.length;
        if (value.length >= maxArchiveDescriptionLength)
          return `Must be fewer than ${maxArchiveDescriptionLength} characters.`;
        return validateOrMessage(archiveEdition.Description, value);
      },
      required: false,
    }
  );
