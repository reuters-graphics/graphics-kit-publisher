import { findIndex, uniq } from 'lodash-es';

import { ConfigType } from '../../setConfig';
import { VALID_LOCALES } from '../../constants/locales';
import askJSON from 'ask-json';
import fs from 'fs-extra';
import getPackMetadata from '../../prepack/getPackMetadata';
import getPkg from '../../utils/getPkg';
import getSchema from './getSchema';
import getServerClient from '../../utils/getServerClient';
import glob from 'glob';
import path from 'path';
import { pymCodeFromTemplate } from '../../constants/embedCodes';
import setPkgProp from '../../utils/setPkgProp';
import urljoin from 'url-join';

const getMediaEditionMetadata = async ({
  slug,
  title,
  description,
}: {
  slug: string;
  title: string;
  description: string;
}) => {
  const pkg = getPkg();
  const mediaEdition = pkg.reuters.graphic.mediaEditions.find(
    (e) => e.slug === slug
  );
  return mediaEdition
    ? askJSON(getSchema({ slug, title, description }), mediaEdition)
    : askJSON(getSchema({ slug, title, description }), { slug });
};

const updateMediaEditionMetadata = (metadata: {
  slug: string;
  url: string;
  title: string;
  description: string;
}) => {
  const pkg = getPkg();
  const index = findIndex(
    pkg.reuters.graphic.mediaEditions,
    (e) => e.slug === metadata.slug
  );
  if (index < 0) {
    pkg.reuters.graphic.mediaEditions.push(metadata);
  } else {
    pkg.reuters.graphic.mediaEditions[index] = metadata;
  }
  setPkgProp(
    'reuters.graphic.mediaEditions',
    pkg.reuters.graphic.mediaEditions
  );
};

export default async (config: ConfigType) => {
  const { title, description } = await getPackMetadata(config);
  const { homepage } = getPkg();
  const SERVER_CLIENT = getServerClient();

  const mediaArchives = glob.sync('media-*.zip', { cwd: config.PACK_DIR });

  for (const mediaArchive of mediaArchives) {
    const slug = path.basename(mediaArchive, '.zip');
    // A bit smelly, but it works...
    const locale = (new RegExp(
      `^media-(${VALID_LOCALES.join('|')})-[a-zA-Z]+[a-zA-Z0-9-]*[a-zA-Z0-9]$`
    ).exec(slug) || [])[1];
    const embedPath = (new RegExp(
      `^media-(${VALID_LOCALES.join('|')})-([a-zA-Z]+[a-zA-Z0-9-]*[a-zA-Z0-9])$`
    ).exec(slug) || [])[2];

    const embedURL = urljoin(homepage, 'embeds', locale, embedPath + '/');
    const metadata = await getMediaEditionMetadata({
      slug,
      title,
      description,
    });

    const editionMetadata = {
      language: locale,
      title: metadata.title,
      description: metadata.description,
      embed: {
        // Strip out pym from the embed code, b/c we'll add it as a dependency...
        declaration: pymCodeFromTemplate(slug, embedURL).replace(
          '<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>',
          ''
        ),
        dependencies:
          '<script type="text/javascript" src="//graphics.thomsonreuters.com/pym.min.js"></script>',
      },
    };
    const fileBuffer = fs.readFileSync(
      path.join(config.PACK_DIR, mediaArchive)
    );

    const existingArchives = uniq(
      SERVER_CLIENT?.graphic?.editions.map((e) => e.file.fileName)
    );

    const exists = existingArchives.includes(mediaArchive);

    if (exists) {
      await SERVER_CLIENT.updateEditions(
        mediaArchive,
        fileBuffer,
        editionMetadata
      );
    } else {
      await SERVER_CLIENT.createEditions(
        mediaArchive,
        fileBuffer,
        editionMetadata
      );
    }

    updateMediaEditionMetadata({
      slug,
      url: embedURL,
      title: metadata.title,
      description: metadata.description,
    });
  }
};
