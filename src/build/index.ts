import { BuildError, PackageConfigError } from '../exceptions/errors';
import { spawn } from 'node:child_process';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import path from 'path';
import { spinner } from '@clack/prompts';
import { cleanOutDir, deleteZeroLengthFiles } from './clean';
import { validateOutDir } from './validate';
import { logs } from '../logging';
import { note } from '@reuters-graphics/clack';
import dedent from 'dedent';
import picocolors from 'picocolors';
import { reflowText } from '../utils/reflowText';

const formatErrorConsoleLog = (err: string) => {
  if (err.trim().length === 0) return '';
  const reflowedErrors = reflowText(err.trim(), 80);
  return (
    '\nPossible errors found:\n\n' +
    reflowedErrors
      .slice(0, 10)
      .map((line) => (line.length > 80 ? line.slice(0, 75) + ' ...' : line))
      .map((e) => `${picocolors.bold(picocolors.red(e.trim()))}\n`)
      .join('') +
    (reflowedErrors.length > 10 ?
      `${picocolors.dim(picocolors.red(`+${reflowedErrors.length - 10} more error lines...`))}\n`
    : '')
  );
};

/**
 * Calls a project's build script and validates the build process completed successfully
 * @param buildScript the build script defined in package.json
 */
const buildApp = async (buildScript: string) => {
  const pkg = utils.getPkg();
  const { cwd, pkgMgr } = context;
  const outDir = path.join(cwd, context.config.build.outDir);

  cleanOutDir(outDir);

  if (!pkg.scripts[buildScript]) {
    throw new PackageConfigError(
      `package.json has no "${buildScript}" script. Check your package scripts or adjust your publisher config.`
    );
  }

  const s = spinner();
  s.start('Building your project');

  let stderr = '';
  let stdout = '';

  return new Promise<void>((resolve, reject) => {
    const child = spawn(pkgMgr?.agent || 'npm', ['run', buildScript], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd,
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', () => {
      reject(new BuildError('App failed to build'));
    });

    child.on('close', (code) => {
      // Write all logs
      logs.writeErrLog(stderr.trim());
      logs.writeOutLog(stdout.trim());

      if (code !== 0) {
        s.stop('Build failed');

        const errorsLog = formatErrorConsoleLog(stderr);

        note(
          dedent`Your project failed to build. This usually means there's an error somewhere in\nyour app's code.
          ${errorsLog}
          See the full logs in ${picocolors.cyan(logs.logDirName)} to diagnose what went wrong.
          `,
          '🚨 Build error'
        );
        reject(new BuildError('App failed to build'));
        return;
      }

      // If the build succeeds:
      try {
        deleteZeroLengthFiles(outDir);

        /**
         * Validates outDir and throws an error if it finds:
         * 1. Invalid file types in the outDir after build
         */
        validateOutDir(s);
        s.stop('Build succeeded');
        resolve();
      } catch (validationError) {
        reject(validationError);
      }
    });
  });
};

/**
 * Runs the project's preview build script
 */
export const buildForPreview = async () => {
  const buildScript = context.config.build.scripts.preview;
  await buildApp(buildScript);
};

/**
 * Runs the project's production build script
 */
export const buildForProduction = async () => {
  const buildScript = context.config.build.scripts.production;
  await buildApp(buildScript);
};
