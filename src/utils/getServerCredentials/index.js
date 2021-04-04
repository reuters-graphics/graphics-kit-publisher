import fs from 'fs-extra';
import os from 'os';
import path from 'path';

export default () => {
  const credFilePath = path.join(os.homedir(), '.reuters-graphics/graphics-server.json');
  if (!fs.existsSync(credFilePath)) throw new Error('Can\'t find graphics server credentials file');
  return fs.readJsonSync(credFilePath);
};
