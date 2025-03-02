import { uploadPreview } from './preview';
import { loadConfig, withIntroOutro } from './decorators';
import { buildForPreview, buildForProduction } from './build';

export { defineConfig } from './config';
export { getBasePath } from './basePaths';

export class GraphicsKitPublisher {
  /**
   * Build and publish a preview of your project
   */
  @loadConfig
  @withIntroOutro
  async preview() {
    buildForPreview();
    await uploadPreview();
  }

  /**
   * Build and upload your project to the graphics server
   */
  @loadConfig
  @withIntroOutro
  async upload() {
    buildForProduction();
  }

  /**
   * Publish your project in the graphics server
   */
  @loadConfig
  @withIntroOutro
  async publish() {}

  /**
   * Clear metadata to a previously uploaded graphics pack in the graphics
   * server and re-upload.
   */
  @loadConfig
  @withIntroOutro
  async restartPack() {
    return this.upload();
  }
}
