import { LocationError } from '../../exceptions/errors';
import fs from 'fs-extra';
import path from 'path';

export default () => {
  const PKG_PATH = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(PKG_PATH)) throw new LocationError('Unable to find package.json in your current working directory. Are you running from the root of your project?');
  return process.cwd();
};
