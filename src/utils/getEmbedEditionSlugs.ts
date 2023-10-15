import type { ConfigType } from './../setConfig';
import { flatten } from 'lodash-es';
import glob from 'glob';
import path from 'path';
import slugify from 'slugify';

/**
 * Return the slugs of all the embeds included in this pack
 * @param config Directory config
 * @returns
 */
const getEmbedEditionSlugs = (config: ConfigType) => {
  const EMBEDS_DIR = path.join(config.DIST_DIR, 'embeds');
  const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

  return flatten(
    embedLocales.map((embedLocale) => {
      const locale = embedLocale.replace('/', '');
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
      return embeds.map(
        (embed) => `media-${locale}-${slugify(path.dirname(embed))}`
      );
    })
  );
};

export default getEmbedEditionSlugs;
