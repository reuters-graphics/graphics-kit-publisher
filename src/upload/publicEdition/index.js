import fs from 'fs-extra';
import path from 'path';

export default {
  async uploadPublicEdition() {
    const { title, description } = this.packageMetadata;

    const editionMetadata = {
      language: this.PACK_LOCALE,
      title,
      description,
    };

    const fileBuffer = fs.readFileSync(path.join(this.PACK_DIR, 'public.zip'));

    await this.SERVER_CLIENT.updateEditions('public.zip', fileBuffer, editionMetadata);
  },
};
