import { ConfigType } from '../../setConfig';
import fs from 'fs-extra';
import getPackMetadata from '../../prepack/getPackMetadata';
import getServerClient from '../../utils/getServerClient';
import path from 'path';

export default async (config: ConfigType) => {
  const { title, description } = await getPackMetadata(config);
  const SERVER_CLIENT = getServerClient();

  const editionMetadata = {
    language: config.PACK_LOCALE,
    title,
    description,
  };

  const fileBuffer = fs.readFileSync(path.join(config.PACK_DIR, 'public.zip'));

  await SERVER_CLIENT.updateEditions('public.zip', fileBuffer, editionMetadata);
};
