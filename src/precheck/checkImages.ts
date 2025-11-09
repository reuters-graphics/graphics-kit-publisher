import { log } from '@clack/prompts';
import { Savile } from '@reuters-graphics/savile';
import { sleep } from '../utils/sleep';
import fs from 'fs';
import path from 'path';
import { context } from '../context';

/**
 * Runs a check for oversized images using @reuters-graphics/savile
 * if a src directory is found.
 */
export const checkImages = async () => {
  const srcDir = path.join(context.cwd, 'src');
  if (!fs.existsSync(srcDir)) return;
  const savile = new Savile(srcDir);
  log.step('Courtesy check for oversized images in your project ...');
  await savile.findImages();
  await savile.logImageFileSize();
  await sleep(2000);
};
