import { editionReadme } from '../../constants/readme';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import { pymCodeFromTemplate } from '../../constants/embedCodes';
import slugify from 'slugify';
import urljoin from 'url-join';

export default {
  async makeEmbedEditions() {
    const EMBEDS_DIR = path.join(this.DIST_DIR, 'embeds');
    const ARCHIVE = path.join(this.PACK_DIR, 'app.zip');
    const embedLocales = glob.sync('*/', { cwd: EMBEDS_DIR });

    const CLIENT_README = path.join(this.CWD, 'CLIENT_README.txt');

    const CUSTOM_README = fs.existsSync(CLIENT_README) ? fs.readFileSync(CLIENT_README, 'utf8') : '';

    for (const embedLocale of embedLocales) {
      const locale = embedLocale.replace('/', '');
      const LOCALE_DIR = path.join(EMBEDS_DIR, locale);
      const embeds = glob.sync('*/index.html', { cwd: LOCALE_DIR });
      for (const embed of embeds) {
        const embedPath = path.relative(this.DIST_DIR, path.join(LOCALE_DIR, embed));
        const embedUrl = urljoin(this.homepage, embedPath);
        const embedSlug = `media-${locale}-${slugify(path.dirname(embed))}`;
        const EMBED_DIR = path.join(this.PACK_DIR, embedSlug, 'media-interactive');
        fs.ensureDirSync(EMBED_DIR);
        const embedCode = pymCodeFromTemplate(embedSlug, embedUrl);
        fs.writeFileSync(path.join(EMBED_DIR, 'EMBED.txt'), embedCode);
        fs.writeFileSync(path.join(EMBED_DIR, 'README.txt'), editionReadme + `\n\n${CUSTOM_README}`);
        fs.copyFileSync(ARCHIVE, path.join(EMBED_DIR, 'app.zip'));
      }
    }
    fs.unlinkSync(ARCHIVE);
  },
};
