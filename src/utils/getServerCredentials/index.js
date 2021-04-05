import { UserConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

export default () => {
  const credFilePath = path.join(os.homedir(), '.reuters-graphics/graphics-server.json');
  if (!fs.existsSync(credFilePath)) throw new UserConfigError(chalk`Can't find graphics server credentials file {yellow ~/.reuters-graphics/graphics-server.json}`);
  return fs.readJsonSync(credFilePath);
};
