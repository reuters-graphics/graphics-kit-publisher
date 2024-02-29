import type { ConfigType } from '../../setConfig';
import type { PackageMetadata } from '../../types';
import { PackageMetadataError } from '../../exceptions/errors';
import askJSON from 'ask-json';
import chalk from 'chalk';
import fs from 'fs-extra';
import { get } from 'lodash-es';
import getPackageSchema from './schemas/package';
import getPkg from '../../utils/getPkg';
import getPkgRoot from '../../utils/getPkgRoot';
import getRelativePath from '../../utils/getRelativePath';
import isServerless from '../../utils/isServerless';
import path from 'path';
import prompts from 'prompts';

/**
 * Ask to set graphic pack updated time in package.json
 */
export const setUpdatedTime = async () => {
  const CWD = getPkgRoot();
  const packageJson = getPkg();
  // If homepage isn't set, then we haven't published yet.
  if (!packageJson.homepage) return;
  // If published time is in the future, don't set an updated time.
  const published = packageJson?.reuters?.graphic?.published || '';
  if (published && new Date(published) >= new Date()) return;
  // Always set the updated time in serverless environment...
  if (isServerless()) {
    packageJson.reuters.graphic.updated = new Date().toISOString();
    // ... otherwise ask.
  } else {
    const { confirm } = await prompts.prompt({
      type: 'confirm',
      name: 'confirm',
      message: packageJson.reuters.graphic.updated
        ? 'Should we reset the updated time?'
        : 'Should we set the updated time?',
      initial: true,
    });
    if (!confirm) return;
    packageJson.reuters.graphic.updated = new Date().toISOString();
  }
  fs.writeFileSync(
    path.join(CWD, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
};

/**
 * Ask any missing package metadata and write to package.json
 * @param prompt Whether to prompt for additional metadata
 * @returns
 */
const getPackageMetadata = async (prompt = true) => {
  const CWD = getPkgRoot();
  const packageJson = getPkg();
  const packageSchema = getPackageSchema();
  const validPackageJson = await askJSON(packageSchema, packageJson, {
    askToAddItems: prompt && !isServerless(),
  });
  fs.writeFileSync(
    path.join(CWD, 'package.json'),
    JSON.stringify(validPackageJson, null, 2)
  );
  if (prompt) await setUpdatedTime();
  return validPackageJson.reuters as Omit<PackageMetadata, 'preview'>;
};

/**
 * Get graphics pack metadata kept in default locale metadata JSON file
 */
const getDefaultLocaleMetadata = async (config: ConfigType) => {
  const defaultLocaleMetadatafile = fs.readJSONSync(config.PACK_METADATA_FILE);
  const title = get(defaultLocaleMetadatafile, config.PACK_TITLE_PROP);
  const description = get(
    defaultLocaleMetadatafile,
    config.PACK_DESCRIPTION_PROP
  );
  if (!title) {
    throw new PackageMetadataError(
      chalk`{cyan ${
        config.PACK_TITLE_PROP
      }} not defined in {yellow ${getRelativePath(
        config.PACK_METADATA_FILE
      )}}. It needs to be.`
    );
  }
  if (!description) {
    throw new PackageMetadataError(
      chalk`{cyan ${
        config.PACK_DESCRIPTION_PROP
      }} not defined in {yellow ${getRelativePath(
        config.PACK_METADATA_FILE
      )}}. It needs to be.`
    );
  }
  return { title, description };
};

/**
 * Get graphic pack metadata
 * @param config Graphics pack config
 * @param prompt Whether to prompt for additional metadata
 */
const getPackMetadata = async (config: ConfigType, prompt = true) => {
  const packageMetadata = await getPackageMetadata(prompt);
  const defaultLocaleMetadata = await getDefaultLocaleMetadata(config);
  return { ...packageMetadata, ...defaultLocaleMetadata };
};

export type PackMetadataType = Awaited<ReturnType<typeof getPackMetadata>>;

export default getPackMetadata;
