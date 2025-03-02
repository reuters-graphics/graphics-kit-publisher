import path from 'path';
import { context } from '../context';
import { utils } from '@reuters-graphics/graphics-bin';

class Logs {
  logDirName = '.graphics-kit/logs/' as const;
  private get logDir() {
    return path.join(context.cwd, this.logDirName);
  }

  private write(filePath: string, logContents: string) {
    const prefix = `----- ${new Date().toISOString()} -----\n\n`;
    utils.fs.ensureWriteFile(filePath, prefix + logContents);
  }

  writeOutLog(logContents: string) {
    this.write(path.join(this.logDir, 'out.log'), logContents);
  }

  writeErrLog(logContents: string) {
    this.write(path.join(this.logDir, 'error.log'), logContents);
  }
}

export const logs = new Logs();
