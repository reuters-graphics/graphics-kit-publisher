import { uploadPreview } from './preview';
import { loadConfig, withIntroOutro } from './decorators';
import { Pack } from './pack';
import { precheck } from './precheck';

export { defineConfig } from './config';
export { getBasePath } from './basePaths';
export { PKG } from './pkg';

export class GraphicsKitPublisher {
  /**
   * Build and publish a preview of your project
   */
  @loadConfig
  @withIntroOutro
  async preview() {
    await uploadPreview();
  }

  /**
   * Build and upload your project to the graphics server
   */
  @loadConfig
  @withIntroOutro
  async upload() {
    await precheck();
    const pack = new Pack();
    await pack.upload();
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
  async resetData() {
    const pack = new Pack();
    await pack.resetPackData();
  }

  @loadConfig
  @withIntroOutro
  async delete() {
    const pack = new Pack();
    await pack.delete();
  }
}
