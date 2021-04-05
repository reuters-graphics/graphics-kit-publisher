import { UserConfigError } from '../../exceptions/errors';
import chalk from 'chalk';
import fs from 'fs-extra';
import get from 'lodash/get';
import os from 'os';
import path from 'path';

const profilePath = path.join(os.homedir(), '.reuters-graphics/profile.json');

export default (objPath) => {
  if (!fs.existsSync(profilePath)) throw new UserConfigError(chalk`Missing Reuters Graphics user profile at {yellow ~/.reuters-graphics/profile.json}`);
  const pkg = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  return get(pkg, objPath);
};
