import fs from 'fs-extra';
import getServerClient from '../../utils/getServerClient';
import path from 'path';
import setPkgProp from '../../utils/setPkgProp';
import zipDir from '../../utils/zipDir';

export default {
  async createGraphicPack(metadata) {
    this.SERVER_CLIENT = getServerClient();

    const packMetadata = {
      rootSlug: metadata.graphic.slugs.root,
      desk: metadata.graphic.desk,
      language: this.DEFAULT_LOCALE,
      title: metadata.title,
      description: metadata.description,
      byline: metadata.contact.name,
      contactEmail: metadata.contact.email,
    };
    if (metadata.graphic.slugs.wild && metadata.graphic.slugs.wild !== '') {
      packMetadata.wildSlug = metadata.graphic.slugs.wild;
    }

    const editionMetadata = {
      language: this.DEFAULT_LOCALE,
      title: metadata.title,
      description: metadata.description,
    };

    await this.SERVER_CLIENT.createGraphic(packMetadata);
    const pack = this.SERVER_CLIENT.graphic.id;

    const PUBLIC_EDITION_DIR = path.join(this.PACK_DIR, 'public/interactive');
    fs.ensureDirSync(PUBLIC_EDITION_DIR);
    fs.writeFileSync(path.join(PUBLIC_EDITION_DIR, 'index.html'), '<html></html>');

    await zipDir(path.join(this.PACK_DIR, 'public'));
    const fileBuffer = fs.readFileSync(path.join(this.PACK_DIR, 'public.zip'));

    const editions = await this.SERVER_CLIENT.createEditions('public.zip', fileBuffer, editionMetadata);

    const { url } = editions['public.zip'].interactive;

    setPkgProp('reuters.graphic.pack', pack);
    setPkgProp('homepage', url);

    fs.unlinkSync(path.join(this.PACK_DIR, 'public.zip'));

    return { pack, url };
  },
};
