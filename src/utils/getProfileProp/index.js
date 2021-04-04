import fs from 'fs';
import get from 'lodash/get';
import os from 'os';
import path from 'path';

const profilePath = path.join(os.homedir(), '.reuters-graphics/profile.json');

export default (objPath) => {
  const pkg = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  return get(pkg, objPath);
};
