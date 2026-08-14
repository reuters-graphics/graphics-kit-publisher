import { BuildError, PackageConfigError } from '../exceptions/errors';
import { spawn } from 'node:child_process';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import path from 'path';
import { spinner } from '@clack/prompts';
import { cleanOutDir, deleteZeroLengthFiles } from './clean';
import { validateOutDir } from './validate';
import { logs } from '../logging';
import {
  PLACEHOLDER_BASE,
  PLACEHOLDER_BASE_ENV_VAR,
} from '../constants/rewrite';
import { PREVIEW_BASE_ENV_VAR } from '../constants/preview';

interface BuildOptions {
  /**
   * Build against the placeholder base URL, so each archive's copy of the output
   * can be rewritten to its own URL afterwards.
   *
   * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
   */
  placeholderBase?: boolean;
  /**
   * Build against this preview URL rather than the one saved in package.json,
   * which is how a branch preview reaches its own subdirectory.
   */
  previewBase?: string;
}

/**
 * The environment a build gets, when it needs one beyond the inherited default.
 *
 * The two base-URL channels are mutually exclusive, and this is where that's
 * enforced: `getBasePath` checks the placeholder first and unconditionally, so a
 * stale `PUBLISHER_PLACEHOLDER_BASE` left exported in a shell would otherwise
 * bake `__GKP_BASE__` into a preview and upload it with nothing to rewrite it.
 */
const buildEnv = (options: BuildOptions) => {
  const env = { ...process.env };
  if (options.placeholderBase) {
    env[PLACEHOLDER_BASE_ENV_VAR] = PLACEHOLDER_BASE;
  } else {
    delete env[PLACEHOLDER_BASE_ENV_VAR];
  }
  if (options.previewBase) {
    env[PREVIEW_BASE_ENV_VAR] = options.previewBase;
  } else {
    delete env[PREVIEW_BASE_ENV_VAR];
  }
  return env;
};

/**
 * Calls a project's build script and validates the build process completed successfully
 * @param buildScript the build script defined in package.json
 * @param options build options
 */
const buildApp = async (buildScript: string, options: BuildOptions = {}) => {
  const pkg = utils.getPkg();
  const { cwd, pkgMgr } = context;
  const outDir = path.join(cwd, context.config.build.outDir);

  cleanOutDir(outDir);

  if (!pkg.scripts[buildScript]) {
    throw new PackageConfigError(
      `package.json has no "${buildScript}" script.`,
      {
        code: 'MISSING_BUILD_SCRIPT',
        hint: 'Add the script to package.json, or point the publisher config at the right script name.',
        context: {
          buildScript,
          availableScripts: Object.keys(pkg.scripts ?? {}),
        },
      }
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
      // Only passed when there's something to say: an inherited environment is
      // the default.
      ...(options.placeholderBase || options.previewBase ?
        { env: buildEnv(options) }
      : {}),
    });

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (cause) => {
      reject(
        new BuildError(`Could not start the "${buildScript}" build script.`, {
          code: 'BUILD_SPAWN_FAILED',
          hint: `Check that "${buildScript}" runs on its own (e.g. \`${pkgMgr?.agent || 'npm'} run ${buildScript}\`).`,
          context: { buildScript, packageManager: pkgMgr?.agent },
          cause,
        })
      );
    });

    child.on('close', (code) => {
      // Write all logs
      logs.writeErrLog(stderr.trim());
      logs.writeOutLog(stdout.trim());

      if (code !== 0) {
        s.stop('Build failed');
        reject(
          new BuildError(
            "Your project failed to build. This usually means there's an error in your app's code.",
            {
              code: 'BUILD_FAILED',
              logPaths: [logs.errLogPath, logs.outLogPath],
              hint: `See the full logs in ${logs.logDirName} to diagnose what went wrong.`,
              context: { buildScript, exitCode: code },
            }
          )
        );
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
 * Runs the project's preview build script.
 *
 * @param previewBase The URL this preview is going to, when it isn't the one in
 * package.json — a branch preview lands in a subdirectory of it, and the build
 * has to know that to get its own asset URLs right.
 */
export const buildForPreview = async (previewBase?: string) => {
  const buildScript = context.config.build.scripts.preview;
  await buildApp(buildScript, { previewBase });
};

/**
 * Runs the project's production build script.
 *
 * Builds against a placeholder base URL rather than a real one. Each archive's
 * copy of this output is rewritten to that archive's own URL when it's packed,
 * which is what makes archives self-contained — and what removes the second
 * build the publisher used to need once URLs existed.
 *
 * @see https://github.com/reuters-graphics/graphics-kit-publisher/issues/162
 */
export const buildForProduction = async () => {
  const buildScript = context.config.build.scripts.production;
  await buildApp(buildScript, { placeholderBase: true });
};
