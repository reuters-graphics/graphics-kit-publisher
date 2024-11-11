import type {
  Edition,
  RNGS,
  ServerClient,
} from '@reuters-graphics/server-client';

import type { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import getPackMetadata from '../../prepack/getPackMetadata';
import path from 'path';

export default async (config: ConfigType, serverClient: ServerClient) => {
  const { title, description } = await getPackMetadata(config, false);

  const editionMetadata: Edition.EditionMetadata = {
    language: config.PACK_LOCALE as RNGS.Language,
    title,
    description,
  };

  const fileBuffer = fs.readFileSync(path.join(config.PACK_DIR, 'public.zip'));

  await serverClient.updateEditions('public.zip', fileBuffer, editionMetadata);
};
