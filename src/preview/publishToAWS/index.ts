import { PREVIEW_ORIGIN } from '../../constants/preview';

import { getPreviewURL } from '../previewURL';
import open from 'open';
import { S3Client, utils } from '@reuters-graphics/graphics-bin';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { context } from '../../context';
import path from 'path';

/**
 * Publish built files in DIST directory to AWS S3
 */
export const publishToAWS = async () => {
  const url = getPreviewURL();

  const bucketDirPath = url.replace(PREVIEW_ORIGIN + '/', '');

  const s3 = new S3Client();
  const uploaded = await s3.uploadLocalDirectory(
    path.join(context.cwd, context.config.build.outDir),
    bucketDirPath
  );

  if (utils.environment.isTestingEnvironment()) {
    return uploaded as PutObjectCommandInput[];
  }
  if (!utils.environment.isCiEnvironment()) {
    await open(url);
  }
};
