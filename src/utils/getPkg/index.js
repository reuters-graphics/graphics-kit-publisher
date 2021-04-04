import fs from 'fs-extra';
import getPkgRoot from '../getPkgRoot';
import path from 'path';

export default () => {
  const CWD = getPkgRoot();
  const PKG_PATH = path.join(CWD, 'package.json');
  return fs.readJsonSync(PKG_PATH);
};
