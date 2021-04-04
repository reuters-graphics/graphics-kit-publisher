import { PackageMetadataError } from '../../exceptions/errors';
import chalk from 'chalk';
import getPkg from '../../utils/getPkg';
import getServerClient from '../../utils/getServerClient';

export default {
  async updateGraphicPack(metadata) {
    this.SERVER_CLIENT = getServerClient(metadata.graphic.pack);

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

    await this.SERVER_CLIENT.updateGraphic(packMetadata);
    const pack = this.SERVER_CLIENT.graphic.id;
    const { homepage: url } = getPkg();
    if (!url) throw new PackageMetadataError(chalk`{cyan homepage} is not defined in your {yellow package.json}. Clear out the graphic pack ID and try again.`);

    return { pack, url };
  },
};
