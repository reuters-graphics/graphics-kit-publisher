import type { ConfigType } from '../setConfig';
import buildPreview from './build';
import getPreviewURL from './getPreviewURL';
import publishToAWS from './publishToAWS';
import { validateBuiltFiles } from '../validateFileSystem';

/**
 * Upload preview of project to AWS S3
 */
export default async (config: ConfigType) => {
  getPreviewURL();
  buildPreview(config);
  validateBuiltFiles(config);
  await publishToAWS(config);
};
