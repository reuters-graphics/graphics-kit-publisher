import type { PackageMetadata } from '../types';
import fs from 'fs-extra';
import getPkgRoot from './getPkgRoot';
import path from 'path';

/**
 * Gets the project's package.json
 */
export default () => {
  const CWD = getPkgRoot();
  const PKG_PATH = path.join(CWD, 'package.json');
  return fs.readJsonSync(PKG_PATH) as {
    homepage: string;
    scripts: {
      build: string;
      'build:preview': string;
    };
    reuters: PackageMetadata;
  };
};
