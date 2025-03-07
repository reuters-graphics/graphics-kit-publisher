import { flatten } from 'es-toolkit';
import { PKG } from '../pkg';
import type { EditionType } from './edition/types/base';
import type { Edition } from '@reuters-graphics/server-client';
import { context } from '../context';

const EDITION_TYPES_ELIGIBLE_FOR_CONNECT = [
  'media-interactive',
  'EPS',
  'PDF',
] as EditionType[];

const EDITION_TYPES_ELIGIBLE_FOR_LYNX = [
  'interactive',
  'JPG',
  'PNG',
] as EditionType[];

const connectFilter = (editionType: EditionType) =>
  EDITION_TYPES_ELIGIBLE_FOR_CONNECT.includes(editionType);

const lynxFilter = (editionType: EditionType) =>
  EDITION_TYPES_ELIGIBLE_FOR_LYNX.includes(editionType);

export const getOptions = (filter: (type: EditionType) => boolean) => {
  const archives = PKG.pack.archives;
  if (!archives) return [];

  const archiveIds = Object.keys(archives);

  const eligible = flatten(
    archiveIds
      .filter((id) => archives[id].editions.some(filter))
      .map((id) =>
        archives[id].editions.filter(filter).map((type) => [id, type])
      )
  );
  return eligible;
};

export const getLynxOptions = () =>
  getOptions(lynxFilter)
    // Filter by publishingLocations config
    .filter(([archiveId]) => {
      const publishingLocations = context.config.publishingLocations.find(
        ({ archive }) => {
          if (typeof archive === 'string') return archive === archiveId;
          return archive.test(archiveId);
        }
      );
      if (!publishingLocations) return true;
      return publishingLocations.availableLocations.lynx;
    })
    // Format archive filename
    .map(([archiveId, editionType]) => [`${archiveId}.zip`, editionType]) as [
    Edition.ArchiveFileName,
    Edition.EditionName,
  ][];

export const getConnectOptions = () =>
  getOptions(connectFilter)
    // Filter by publishingLocations config
    .filter(([archiveId]) => {
      const publishingLocations = context.config.publishingLocations.find(
        ({ archive }) => {
          if (typeof archive === 'string') return archive === archiveId;
          return archive.test(archiveId);
        }
      );
      if (!publishingLocations) return true;
      return publishingLocations.availableLocations.connect;
    })
    // Format archive filename
    .map(([archiveId, editionType]) => [`${archiveId}.zip`, editionType]) as [
    Edition.ArchiveFileName,
    Edition.EditionName,
  ][];
