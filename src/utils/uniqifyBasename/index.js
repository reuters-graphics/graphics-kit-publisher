import { customAlphabet } from 'nanoid';
import path from 'path';

const nanoid = customAlphabet('abcdefgABCDEFG', 6);

export default (filePath) => {
  const filename = path.basename(filePath);
  const dirname = path.dirname(filePath);
  return path.join(dirname, nanoid() + filename);
};
