import path from 'path';
import fs from 'fs-extra';
import { context } from '../context';

class Logs {
  logDirName = '.graphics-kit/' as const;
  private get logDir() {
    return path.join(context.cwd, this.logDirName);
  }

  private write(filePath: string, logContents: string) {
    fs.ensureDirSync(this.logDir);
    const prefix = `----- ${new Date().toISOString()} -----\n\n`;
    fs.writeFileSync(filePath, prefix + logContents, 'utf8');
  }

  writeOutLog(logContents: string) {
    this.write(path.join(this.logDir, 'out.log'), logContents);
  }

  writeErrLog(logContents: string) {
    this.write(path.join(this.logDir, 'error.log'), logContents);
  }
}

export const logs = new Logs();
