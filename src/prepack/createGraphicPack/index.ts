import type { ConfigType } from '../../setConfig';
import type { PackMetadataType } from '../getPackMetadata';
import fs from 'fs-extra';
import getServerClient from '../../utils/getServerClient';
import path from 'path';
import setPkgProp from '../../utils/setPkgProp';
import zipDir from '../../utils/zipDir';

/**
 * Create a graphic pack
 */
export default async (metadata: PackMetadataType, config: ConfigType) => {
  const serverClient = getServerClient();

  const packMetadata = {
    rootSlug: metadata.graphic.slugs.root,
    wildSlug: metadata.graphic.slugs.wild || undefined,
    desk: metadata.graphic.desk,
    language: config.PACK_LOCALE,
    title: metadata.title,
    description: metadata.description,
    byline: metadata.contact.name,
    contactEmail: metadata.contact.email,
  };

  const editionMetadata = {
    language: config.PACK_LOCALE,
    title: metadata.title,
    description: metadata.description,
  };

  await serverClient.createGraphic(packMetadata);
  const pack = serverClient?.graphic?.id;
  if (!pack) throw new Error('Did not get a graphic ID from the RNGS server');

  const PUBLIC_EDITION_DIR = path.join(config.PACK_DIR, 'public/interactive');
  fs.ensureDirSync(PUBLIC_EDITION_DIR);
  fs.writeFileSync(
    path.join(PUBLIC_EDITION_DIR, 'index.html'),
    '<html></html>'
  );

  await zipDir(path.join(config.PACK_DIR, 'public'));
  const fileBuffer = fs.readFileSync(path.join(config.PACK_DIR, 'public.zip'));

  const editions = await serverClient.createEditions(
    'public.zip',
    fileBuffer,
    editionMetadata
  );

  const { url } = editions['public.zip'].interactive;

  setPkgProp('reuters.graphic.pack', pack);

  /**
   * TEMP: Force graphics.reuters.com URLs from RNGS
   * to be www.reuters.com/graphics/ until RNGS gives
   * us back the correct URL.
   */
  const standardisedURL = url.replace(
    'graphics.reuters.com',
    'www.reuters.com/graphics'
  );

  setPkgProp('homepage', standardisedURL);

  fs.unlinkSync(path.join(config.PACK_DIR, 'public.zip'));

  return serverClient;
};
