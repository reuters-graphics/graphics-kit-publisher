import fs from 'fs-extra';
import getPkg from './getPkg';
import getPkgRoot from './getPkgRoot';
import path from 'path';
import { set } from 'lodash-es';

export default (
  prop: string,
  value: string | number | Record<string, string>[]
) => {
  const pkg = getPkg();
  const CWD = getPkgRoot();
  set(pkg, prop, value);
  fs.writeFileSync(
    path.join(CWD, 'package.json'),
    JSON.stringify(pkg, null, 2)
  );
};
