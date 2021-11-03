import fs from 'fs-extra';
import getPkgRoot from '../getPkgRoot';
import path from 'path';

const getOKlistPath = () => {
  const OKLIST = path.join(getPkgRoot(), 'node_modules/.reuters-graphics/image-size-ok.json');
  // Ensure it's there
  if (!fs.existsSync(OKLIST)) {
    fs.ensureDirSync(path.dirname(OKLIST));
    fs.writeFileSync(OKLIST, '[]');
  }
  return OKLIST;
};

export const getOK = () => fs.readJSONSync(getOKlistPath());

export const writeOK = (allowedImages) => fs.writeJSONSync(getOKlistPath(), allowedImages);
