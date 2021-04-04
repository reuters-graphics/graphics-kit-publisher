import { VALID_LOCALES } from '../../constants/locales';
import askJSON from 'ask-json';
import findIndex from 'lodash/findIndex';
import fs from 'fs-extra';
import getPkg from '../../utils/getPkg';
import getSchema from './getSchema';
import glob from 'glob';
import path from 'path';
import { pymCodeFromTemplate } from '../../constants/embedCodes';
import setPkgProp from '../../utils/setPkgProp';
import uniq from 'lodash/uniq';
import urljoin from 'url-join';

const getMediaEditionMetadata = async({ slug, title, description }) => {
  const pkg = getPkg();
  const mediaEdition = pkg.reuters.graphic.mediaEditions.find(e => e.slug === slug);
  return mediaEdition ?
    askJSON(getSchema({ slug, title, description }), mediaEdition) :
    askJSON(getSchema({ slug, title, description }), { slug });
};

const updateMediaEditionMetadata = (metadata) => {
  const pkg = getPkg();
  const index = findIndex(pkg.reuters.graphic.mediaEditions, e => e.slug === metadata.slug);
  if (index < 0) {
    pkg.reuters.graphic.mediaEditions.push(metadata);
  } else {
    pkg.reuters.graphic.mediaEditions[index] = metadata;
  }
  setPkgProp('reuters.graphic.mediaEditions', pkg.reuters.graphic.mediaEditions);
};

export default {
  async uploadMediaEditions() {
    const { title, description } = this.packageMetadata;
    const { homepage } = getPkg();

    const mediaArchives = glob.sync('media-*.zip', { cwd: this.PACK_DIR });

    for (const mediaArchive of mediaArchives) {
      const slug = path.basename(mediaArchive, '.zip');
      // A bit smelly, but it works...
      const locale = new RegExp(`^media-(${VALID_LOCALES.join('|')})-[a-zA-Z]+[a-zA-Z0-9-]*[a-zA-Z0-9]$`).exec(slug)[1];
      const embedPath = new RegExp(`^media-(${VALID_LOCALES.join('|')})-([a-zA-Z]+[a-zA-Z0-9-]*[a-zA-Z0-9])$`).exec(slug)[2];

      const embedURL = urljoin(homepage, 'embeds', locale, embedPath + '/');
      const metadata = await getMediaEditionMetadata({ slug, title, description });

      const editionMetadata = {
        language: locale,
        title: metadata.title,
        description: metadata.description,
        embed: {
          declaration: pymCodeFromTemplate(slug, embedURL),
          dependencies: '<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>',
        },
      };
      const fileBuffer = fs.readFileSync(path.join(this.PACK_DIR, mediaArchive));

      const existingArchives = uniq(this.SERVER_CLIENT.graphic.editions.map(e => e.file.fileName));

      const exists = existingArchives.includes(mediaArchive);

      if (exists) {
        await this.SERVER_CLIENT.updateEditions(mediaArchive, fileBuffer, editionMetadata);
      } else {
        await this.SERVER_CLIENT.createEditions(mediaArchive, fileBuffer, editionMetadata);
      }

      updateMediaEditionMetadata({
        slug,
        url: embedURL,
        title: metadata.title,
        description: metadata.description,
      });
    }
  },
};
