import { uploadPreview } from './preview';
import { loadConfig, withIntroOutro } from './decorators';
import { Pack } from './pack';
import { precheck } from './precheck';
import { log } from '@clack/prompts';
import picocolors from 'picocolors';

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
    log.info(`Running: ${picocolors.green('preview')}`);
    await uploadPreview();
  }

  /**
   * Build and upload your project to the graphics server
   */
  @loadConfig
  @withIntroOutro
  async upload() {
    log.info(`Running: ${picocolors.green('upload')}`);
    await precheck();
    const pack = new Pack();
    await pack.upload();
  }

  /**
   * Build and upload just the public archive to the graphics server
   */
  @loadConfig
  @withIntroOutro
  async uploadPublicOnly() {
    log.info(`Running: ${picocolors.green('upload:quick')}`);
    await precheck();
    const pack = new Pack();
    await pack.upload(true);
  }

  /**
   * Publish your project in the graphics server
   */
  @loadConfig
  @withIntroOutro
  async publish() {
    log.info(`Running: ${picocolors.green('publish')}`);
    const pack = new Pack();
    await pack.publish();
  }

  /**
   * Clear metadata to a previously uploaded graphics pack in the graphics
   * server and re-upload.
   */
  @loadConfig
  @withIntroOutro
  async restart() {
    log.info(`Running: ${picocolors.green('restart')}`);
    const pack = new Pack();
    await pack.resetPackData();
  }

  @loadConfig
  @withIntroOutro
  async delete() {
    log.info(`Running: ${picocolors.green('delete')}`);
    const pack = new Pack();
    await pack.delete();
  }
}
