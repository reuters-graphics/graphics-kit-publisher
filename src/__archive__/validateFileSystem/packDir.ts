import fs from 'fs-extra';

/**
 * Ensure pack directory exists.
 * @param PACK_DIR Pack directoy
 */
export const validatePackDir = (PACK_DIR: string) => {
  if (!fs.existsSync(PACK_DIR)) fs.mkdirpSync(PACK_DIR);
};
