import { uploadPreview } from './preview';
import { loadConfig, withIntroOutro } from './decorators';
import { Pack } from './pack';
import { precheck } from './precheck';
import { log } from '@clack/prompts';
import picocolors from 'picocolors';
import fs from 'fs';
import { latestDiagnosticsPath } from './diagnostics';
import { offerDiagnosisHandoff } from './diagnostics/handoff';
import { FileNotFoundError } from './exceptions/errors';

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

  /**
   * Re-open an AI diagnosis of the last command that failed, using the
   * diagnostics file written to `.graphics-kit/diagnostics/latest.md`. Lets you
   * look into a failure without re-running a slow command (e.g. a build).
   */
  @loadConfig
  @withIntroOutro
  async diagnose() {
    log.info(`Running: ${picocolors.green('diagnose')}`);
    const diagnosticsPath = latestDiagnosticsPath();
    if (!fs.existsSync(diagnosticsPath)) {
      throw new FileNotFoundError('No diagnostics found to diagnose.', {
        code: 'NO_DIAGNOSTICS',
        hint: 'Run a publisher command that fails first — it writes the diagnostics file this command re-opens.',
        context: { expectedAt: diagnosticsPath },
      });
    }
    await offerDiagnosisHandoff({
      diagnosticsPath,
      command: 'diagnose',
      force: true,
    });
  }
}
