import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';

export class JPG extends Edition {
  public static type = 'JPG' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(JPG.type, pack, path, locale, mediaSlug);
  }
}
