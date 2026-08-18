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
  /**
   * Order matters, and isn't incidental. `getPreviewURL` writes this branch's
   * URL to `package.json`; the build then reads it back off disk, because that
   * file is the only channel between the publisher and the build it spawns —
   * page builders call `getBasePath('preview')` from their own config, in a
   * child process. So the write has to land first.
   *
   * Don't reorder these, and don't run them concurrently: the build would read a
   * missing or stale entry and bake a wrong base path in, silently.
   */
  const { url, bucketPath, slug } = getPreviewURL();

  await buildForPreview();

  const s3 = new S3Client();
  console.log(''); // Silly to make the logs look nicer...
  const uploaded = await s3.uploadLocalDirectory(
    path.join(context.cwd, context.config.build.outDir),
    bucketPath
  );

  if (utils.environment.isTestingEnvironment()) {
    return uploaded as PutObjectCommandInput[];
  }

  log.info(
    `Uploaded preview of ${picocolors.bold(slug)} to: ${picocolors.cyan(url)}`
  );

  if (!utils.environment.isCiEnvironment()) {
    await open(url);
  }
};
