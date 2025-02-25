import type { RNGS } from '@reuters-graphics/server-client';
import type { Edition } from '../edition';
import type { Pack } from '..';
import { description, title, type ArchiveEditionsMetadata } from './metadata';
import { isValid, archiveEdition } from '../../validators';
import path from 'path';
import { utils } from '@reuters-graphics/graphics-bin';

export class Archive {
  public editions: Edition[] = [];
  public metadata: Partial<ArchiveEditionsMetadata> = {};
  public type: 'public' | 'media';
  constructor(
    public pack: Pack,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    this.type = mediaSlug ? 'media' : 'public';
    pack.archives.push(this);
  }

  public get id() {
    if (this.type === 'public') return this.type;
    return `${this.type}-${this.locale}-${this.mediaSlug}`;
  }

  private async getMetadata() {
    if (isValid(archiveEdition.Metadata, this.metadata))
      return this.metadata as ArchiveEditionsMetadata;

    this.metadata.language = this.locale as RNGS.Language;
    this.metadata.title = await title(this.pack.metadata.title!.length);
    this.metadata.description = await description(
      this.pack.metadata.description!.length
    );

    return this.metadata as ArchiveEditionsMetadata;
  }

  packUp() {
    const archiveDir = path.join(this.pack.packRoot, this.id, '');
    utils.fs.ensureDir(archiveDir);
    for (const edition of this.editions) {
      edition.packUp(archiveDir);
    }
  }
}
