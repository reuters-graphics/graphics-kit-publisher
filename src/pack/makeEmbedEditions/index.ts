import type { ConfigType } from '../../setConfig';
import { PackageMetadataError } from '../../exceptions/errors';
import { editionReadme } from '../../constants/readme';
import fs from 'fs-extra';
import { getHomepage } from '../../metadata';
import getPkgRoot from '../../utils/getPkgRoot';
import glob from 'glob';
import path from 'path';
import { pymCodeFromTemplate } from '../../constants/embedCodes';
import slugify from 'slugify';
import urljoin from 'url-join';

export default async (config: ConfigType) => {
  const cwd = getPkgRoot();
  const homepage = getHomepage();
  if (!homepage) {
    throw new PackageMetadataError('No homepage set in package.json');
  }
  const EMBEDS_DIR = path.join(config.DIST_DIR, 'embeds');
  const ARCHIVE = path.join(config.PACK_DIR, 'app.zip');
  const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

  const CLIENT_README = path.join(cwd, 'CLIENT_README.txt');

  const CUSTOM_README = fs.existsSync(CLIENT_README)
    ? fs.readFileSync(CLIENT_README, 'utf8')
    : '';

  for (const embedLocale of embedLocales) {
    const locale = embedLocale.replace('/', '');
    const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
    const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
    for (const embed of embeds) {
      const embedPath = path.relative(
        config.DIST_DIR,
        path.join(LOCALE_DIR, embed)
      );
      const embedUrl = urljoin(homepage, embedPath);
      const embedSlug = `media-${locale}-${slugify(path.dirname(embed))}`;
      // media-interactive edition
      const EMBED_MEDIA_DIR = path.join(
        config.PACK_DIR,
        embedSlug,
        'media-interactive'
      );
      fs.ensureDirSync(EMBED_MEDIA_DIR);
      const embedCode = pymCodeFromTemplate(embedSlug, embedUrl);
      fs.writeFileSync(path.join(EMBED_MEDIA_DIR, 'EMBED.txt'), embedCode);
      fs.writeFileSync(
        path.join(EMBED_MEDIA_DIR, 'README.txt'),
        editionReadme + `\n\n${CUSTOM_README}`
      );
      fs.copyFileSync(ARCHIVE, path.join(EMBED_MEDIA_DIR, 'app.zip'));
      // interactive edition
      const EMBED_INTERACTIVE_DIR = path.join(
        config.PACK_DIR,
        embedSlug,
        'interactive'
      );
      fs.ensureDirSync(EMBED_INTERACTIVE_DIR);
      fs.copyFileSync(
        path.join(LOCALE_DIR, embed),
        path.join(EMBED_INTERACTIVE_DIR, 'index.html')
      );
    }
  }
  fs.unlinkSync(ARCHIVE);
};
