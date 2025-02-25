import fs from 'fs';
import { FileSystemError } from '../../../exceptions/errors';
import type { Pack } from '../..';
import type { Archive } from '../../archive';
import type { RNGS } from '@reuters-graphics/server-client';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../../../context';

type EditionType =
  | 'interactive'
  | 'media-interactive'
  | 'JPG'
  | 'EPS'
  | 'PNG'
  | 'PDF';

export class Edition {
  public archive: Archive;
  /**
   * Creates an instance of Edition.
   * @param {Pack} pack Pack instance
   * @param {string} path Path to root edition file
   * @param {RNGS.Language} locale Edition locale
   * @param {string} [mediaSlug] Slug for media editions
   * @memberof Edition
   */
  constructor(
    public type: EditionType,
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    this.archive = this.pack.getOrCreateArchive(locale, mediaSlug);
    this.archive.editions.push(this);
    if (!fs.existsSync(path)) {
      throw new FileSystemError(
        `Local path for edition detected but not found on file system: ${path}`
      );
    }
  }

  async packUp(archiveDir: string) {
    const relFilePath = path.relative(context.cwd, this.path);
    const absSrc = path.join(context.cwd, relFilePath);
    const absDest = path.join(
      archiveDir,
      this.type,
      path.basename(relFilePath)
    );
    utils.fs.ensureDir(absDest);
    fs.copyFileSync(absSrc, absDest);
  }
}
