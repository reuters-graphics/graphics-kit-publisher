import path from 'path';
import { context } from '../context';
import { utils } from '@reuters-graphics/graphics-bin';

class Logs {
  logDirName = '.graphics-kit/logs/' as const;
  private get logDir() {
    return path.join(context.cwd, this.logDirName);
  }

  /** Absolute path to the stderr log file. */
  get errLogPath() {
    return path.join(this.logDir, 'error.log');
  }

  /** Absolute path to the stdout log file. */
  get outLogPath() {
    return path.join(this.logDir, 'out.log');
  }

  private write(filePath: string, logContents: string) {
    const prefix = `----- ${new Date().toISOString()} -----\n\n`;
    utils.fs.ensureWriteFile(filePath, prefix + logContents);
  }

  writeOutLog(logContents: string) {
    this.write(this.outLogPath, logContents);
  }

  writeErrLog(logContents: string) {
    this.write(this.errLogPath, logContents);
  }
}

export const logs = new Logs();
