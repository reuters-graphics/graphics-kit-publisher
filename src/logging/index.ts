import path from 'path';
import fs from 'fs';
import * as find from 'empathic/find';
import ignore from 'ignore';
import { context } from '../context';
import { utils } from '@reuters-graphics/graphics-bin';
import { note } from '@reuters-graphics/clack';
import picocolors from 'picocolors';

/** The publisher's working directory — logs and diagnostics live here. */
export const GRAPHICS_KIT_DIR = '.graphics-kit/';

/**
 * Ensure `.graphics-kit/` is git-ignored so the logs and diagnostics we write
 * there (which can contain build output) are never committed.
 *
 * Called wherever we first write into `.graphics-kit/`. Best-effort and idempotent:
 * - Not a git repo → nothing to do.
 * - Already ignored → nothing to do.
 * - `.gitignore` exists but doesn't cover it → append the entry.
 * - Git repo with no `.gitignore` → create one.
 *
 * Never throws — a failure here must not mask the caller's real work.
 */
export const ensureGraphicsKitIgnored = () => {
  try {
    const { cwd } = context;
    if (!find.up('.git', { cwd })) return;

    const entry = `# Reuters Graphics publisher working files\n${GRAPHICS_KIT_DIR}\n`;
    const ignoreFile = find.up('.gitignore', { cwd });

    if (!ignoreFile) {
      fs.writeFileSync(path.join(cwd, '.gitignore'), entry);
      note(
        `Created ${picocolors.cyan('.gitignore')} ignoring ${picocolors.cyan(GRAPHICS_KIT_DIR)}.`,
        'Updated .gitignore'
      );
      return;
    }

    const contents = fs.readFileSync(ignoreFile, 'utf8');
    // `ignore().createFilter()` returns true for paths that are NOT ignored.
    const notIgnored = ignore().add(contents).createFilter();
    if (!notIgnored(path.join(GRAPHICS_KIT_DIR, 'probe'))) return; // already ignored

    const separator =
      contents.length === 0 || contents.endsWith('\n') ? '\n' : '\n\n';
    fs.appendFileSync(ignoreFile, separator + entry);
    note(
      `Added ${picocolors.cyan(GRAPHICS_KIT_DIR)} to ${picocolors.cyan('.gitignore')}.`,
      'Updated .gitignore'
    );
  } catch {
    // Best-effort — never block the caller on gitignore housekeeping.
  }
};

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
    ensureGraphicsKitIgnored();
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
