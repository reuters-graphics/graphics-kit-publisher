import type { ConfigType } from '../setConfig';
import archiveEditions from './archiveEditions';
import build from './build';
import makeAssetEditions from './makeAssetEditions';
import makeEmbedEditions from './makeEmbedEditions';
import makePreviewImages from './makePreviewImages';
import makePublicEdition from './makePublicEdition';
import makeSrcArchive from './makeSrcArchive';
import resetPackDir from './resetPackDir';
import { validateBuiltFiles } from '../validateFileSystem';

/**
 * Creates graphic pack public and media edition archives
 */
export default async (config: ConfigType) => {
  resetPackDir(config);
  build(config);
  validateBuiltFiles(config);
  await makeSrcArchive(config);
  await makePublicEdition(config);
  makeEmbedEditions(config);
  await makePreviewImages(config);
  await makeAssetEditions(config);
  await archiveEditions(config);
};
