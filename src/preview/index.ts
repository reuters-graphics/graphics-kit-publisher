import { PREVIEW_ORIGIN } from '../constants/preview';

import { getPreviewURL } from './previewURL';
import open from 'open';
import { S3Client, utils } from '@reuters-graphics/graphics-bin';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { context } from '../context';
import path from 'path';
import { log } from '@clack/prompts';
import picocolors from 'picocolors';
import { buildForPreview } from '../build';

export const uploadPreview = async () => {
  const url = getPreviewURL();

  await buildForPreview();

  const bucketDirPath = url.replace(PREVIEW_ORIGIN + '/', '');

  const s3 = new S3Client();
  console.log(''); // Silly to make the logs look nicer...
  const uploaded = await s3.uploadLocalDirectory(
    path.join(context.cwd, context.config.build.outDir),
    bucketDirPath
  );

  if (utils.environment.isTestingEnvironment()) {
    return uploaded as PutObjectCommandInput[];
  }

  log.info(`Uploaded to: ${picocolors.cyan(url)}`);

  if (!utils.environment.isCiEnvironment()) {
    await open(url);
  }
};
