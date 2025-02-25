import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';
import fs from 'fs';
import type { JPG } from './jpg';
import type { PNG } from './png';
import { context } from '../../../context';

export class EPS extends Edition {
  public static type = 'EPS' as const;
  constructor(
    public pack: Pack,
    public img: JPG | PNG,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(EPS.type, pack, path, locale, mediaSlug);
  }

  async packUp(archiveDir: string) {
    const cwd = context.cwd;
    const relFilePath = path.relative(cwd, this.path);
    const absSrc = path.join(cwd, relFilePath);
    const absDest = path.join(
      archiveDir,
      this.type,
      path.basename(relFilePath)
    );
    utils.fs.ensureDir(absDest);
    console.log(absDest);
    fs.copyFileSync(absSrc, absDest);
    fs.copyFileSync(
      this.img.path,
      path.join(archiveDir, this.type, path.basename(this.img.path))
    );
  }
}
