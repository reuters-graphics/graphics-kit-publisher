import { UserConfigError } from '../exceptions/errors';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';
import picocolors from 'picocolors';

export const getServerCredentials = () => {
  // For serverless environments, use env vars...
  if (utils.environment.isCiEnvironment()) {
    return {
      username: process.env.GRAPHICS_SERVER_USERNAME,
      password: process.env.GRAPHICS_SERVER_PASSWORD,
      apiKey: process.env.GRAPHICS_SERVER_API_KEY,
    };
  }
  const credFilePath = path.join(
    os.homedir(),
    '.reuters-graphics/graphics-server.json'
  );
  if (!fs.existsSync(credFilePath)) {
    throw new UserConfigError(
      `Can't find graphics server credentials file ${picocolors.yellow('~/.reuters-graphics/graphics-server.json')}`
    );
  }
  return fs.readJsonSync(credFilePath);
};
