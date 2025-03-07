import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';

export class PDF extends Edition {
  public static type = 'PDF' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(PDF.type, pack, path, locale, mediaSlug);
  }
}
