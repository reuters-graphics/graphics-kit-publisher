import { PREVIEW_ORIGIN } from '../../constants/preview';

import { ConfigType } from '../../setConfig';
import getPreviewURL from '../getPreviewURL';
import open from 'open';
import { S3Client, utils } from '@reuters-graphics/graphics-bin';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';

/**
 * Publish built files in DIST directory to AWS S3
 */
const publishToAWS = async (config: ConfigType) => {
  const URL = getPreviewURL();

  const bucketDirPath = URL.replace(PREVIEW_ORIGIN + '/', '');

  const s3 = new S3Client();
  const uploaded = await s3.uploadLocalDirectory(
    config.DIST_DIR,
    bucketDirPath
  );

  if (utils.environment.isTestingEnvironment()) {
    return uploaded as PutObjectCommandInput[];
  }
  await open(URL);
};

export default publishToAWS;
