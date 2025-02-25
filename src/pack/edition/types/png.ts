import type { RNGS } from '@reuters-graphics/server-client';
import type { Pack } from '../..';
import { Edition } from './base';

export class PNG extends Edition {
  public static type = 'PNG' as const;
  constructor(
    public pack: Pack,
    public path: string,
    public locale: RNGS.Language,
    public mediaSlug?: string
  ) {
    super(PNG.type, pack, path, locale, mediaSlug);
  }
}
