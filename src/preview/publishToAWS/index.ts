import { PREVIEW_HOST, PREVIEW_ORIGIN } from '../../constants/preview';

import AWS from 'aws-sdk';
import { ConfigType } from '../../setConfig';
import chalk from 'chalk';
import fs from 'fs-extra';
import getPreviewURL from '../getPreviewURL';
import glob from 'glob';
import mime from 'mime-types';
import open from 'open';
import path from 'path';

const AWS_REGION = 'us-east-1';

const s3 = new AWS.S3({ region: AWS_REGION });

// Logging
const LOGFILE = path.join(process.cwd(), '.aws.publish.log');
const readLog = () => {
  if (!fs.existsSync(LOGFILE)) fs.writeFileSync(LOGFILE, '{}');
  return JSON.parse(fs.readFileSync(LOGFILE, 'utf-8'), (k, v) => {
    return typeof v === 'string' ? new Date(v) : v;
  });
};
const writeLog = () => fs.writeFileSync(LOGFILE, JSON.stringify(LOG));
const LOG = readLog();

/**
 * Upload a file to AWS S3
 */
const uploadFile = async (
  relativeFilePath: string,
  URL: string,
  DIST_DIR: string
) => {
  const absoluteFilePath = path.resolve(DIST_DIR, relativeFilePath);

  const currentModifiedTime = fs.statSync(absoluteFilePath).mtime;
  const lastModifiedTime = LOG[URL + relativeFilePath];

  if (lastModifiedTime && currentModifiedTime <= lastModifiedTime) {
    console.log(chalk`{green.dim Skip} {yellow.dim ${relativeFilePath}}`);
    return;
  } else {
    console.log(chalk`{green.dim Send} {yellow.dim ${relativeFilePath}}`);
    LOG[URL + relativeFilePath] = currentModifiedTime;
  }

  const fileContent = fs.readFileSync(absoluteFilePath);

  const bucketPath = path.join(
    URL.replace(PREVIEW_ORIGIN + '/', ''),
    relativeFilePath
  );

  const contentType = mime.contentType(path.extname(absoluteFilePath));
  if (!contentType) return;

  const params = {
    Bucket: PREVIEW_HOST,
    Key: bucketPath,
    Body: fileContent,
    CacheControl: 'no-cache',
    ContentType: contentType,
  };

  return new Promise<void>((resolve, reject) => {
    s3.putObject(params, function (err, data) {
      if (err) reject(err);
      resolve();
    });
  });
};

/**
 * Publish built files in DIST directory to AWS S3
 */
export default async (config: ConfigType) => {
  const URL = getPreviewURL();
  const files = glob.sync('**/*', { cwd: config.DIST_DIR, nodir: true });
  await Promise.all(
    files.map((file) => uploadFile(file, URL, config.DIST_DIR))
  );
  writeLog();
  await open(URL);
};
