import path from 'path';
import fs from 'fs';
import { spawn } from 'node:child_process';
import { select, isCancel } from '@clack/prompts';
import { note } from '@reuters-graphics/clack';
import picocolors from 'picocolors';
import open from 'open';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';

export interface HandoffOptions {
  /** Absolute path to the diagnostics file, or null if none was written. */
  diagnosticsPath: string | null;
  /** The command that failed, for the prompt text. */
  command?: string;
  /**
   * Bypass the `ai: 'off'` / `--no-ai` gate. Used by the explicit `diagnose`
   * command — those settings govern the *automatic* post-failure prompt, not a
   * deliberate request. Interactivity and surface availability are still checked.
   */
  force?: boolean;
}

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested)                                          */
/* ------------------------------------------------------------------ */

/**
 * Whether the AI handoff is enabled. Disabled by `--no-ai` or `ai: 'off'` config.
 */
export const isAiEnabled = (
  opts: { configAi?: string; argv?: string[] } = {}
): boolean => {
  const argv = opts.argv ?? process.argv;
  if (argv.includes('--no-ai')) return false;
  const configAi = opts.configAi ?? context.config.ai;
  return configAi !== 'off';
};

export interface Surfaces {
  /** VSCode extension deep-link is viable (we're in an integrated terminal). */
  extension: boolean;
  /** `claude` CLI is on PATH. */
  terminal: boolean;
}

/**
 * Which Claude Code surfaces are available — availability only, not credentials.
 */
export const detectSurfaces = (
  opts: { termProgram?: string; claudeOnPath?: boolean } = {}
): Surfaces => {
  const termProgram = opts.termProgram ?? process.env.TERM_PROGRAM;
  const claudeOnPath = opts.claudeOnPath ?? isClaudeOnPath();
  return { extension: termProgram === 'vscode', terminal: claudeOnPath };
};

/** The short prompt handed to Claude — points at the file, never inlines it. */
export const buildPointer = (
  diagnosticsPath: string,
  command?: string
): string =>
  `Read ${diagnosticsPath} and diagnose the ${command ? `"${command}" ` : ''}failure.`;

/** The VSCode extension deep-link that pre-fills (but does not submit) the prompt. */
export const buildExtensionUrl = (pointer: string): string =>
  `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(pointer)}`;

/**
 * Resolve whether a real `claude` executable is on PATH. A shell *alias* is not
 * found — correct, since `spawn` can't use aliases either.
 */
export const isClaudeOnPath = (): boolean => {
  const envPath = process.env.PATH;
  if (!envPath) return false;
  const extensions =
    process.platform === 'win32' ?
      (process.env.PATHEXT ?? '.EXE;.CMD;.BAT').split(';')
    : [''];
  for (const dir of envPath.split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      try {
        fs.accessSync(path.join(dir, `claude${ext}`), fs.constants.X_OK);
        return true;
      } catch {
        // not in this dir
      }
    }
  }
  return false;
};

/* ------------------------------------------------------------------ */
/* Interactive handoff                                                 */
/* ------------------------------------------------------------------ */

const isInteractive = (): boolean =>
  !utils.environment.isCiEnvironment() &&
  !!process.stdout.isTTY &&
  !!process.stdin.isTTY;

/** Run a one-shot `claude -p` diagnosis, streaming to the terminal. Never rejects. */
const runTerminalDiagnosis = (pointer: string): Promise<void> =>
  new Promise((resolve) => {
    const child = spawn('claude', ['-p', pointer, '--output-format', 'text'], {
      cwd: context.cwd,
      stdio: 'inherit',
    });
    child.on('close', () => resolve());
    child.on('error', () => resolve());
  });

/**
 * After a failure, offer to hand the diagnostics file off to Claude Code — the
 * VSCode extension (chat next to the code) or a one-shot `claude -p` in the
 * terminal. Best-effort and never throws; returns without prompting when a
 * handoff isn't possible (disabled, non-interactive, or nothing available).
 */
export const offerDiagnosisHandoff = async ({
  diagnosticsPath,
  command,
  force = false,
}: HandoffOptions): Promise<void> => {
  try {
    if (!diagnosticsPath || !isInteractive()) return;
    if (!force && !isAiEnabled()) return;

    const surfaces = detectSurfaces();
    const pointer = buildPointer(diagnosticsPath, command);
    const copyPasteNote = () =>
      note(
        `Diagnose later with:\n${picocolors.cyan(`claude "$(cat ${diagnosticsPath})"`)}`,
        'AI diagnosis'
      );

    if (!surfaces.extension && !surfaces.terminal) {
      copyPasteNote();
      return;
    }

    const options: { value: string; label: string; hint?: string }[] = [];
    if (surfaces.extension)
      options.push({
        value: 'extension',
        label: 'Open a Claude Code session to diagnose & fix it',
        hint: 'VSCode extension',
      });
    if (surfaces.terminal)
      options.push({
        value: 'terminal',
        label: 'Ask Claude what went wrong',
        hint: 'claude in terminal',
      });
    options.push({ value: 'no', label: 'No thanks' });

    const choice = await select({
      message: `Your "${command ?? 'command'}" command failed. Diagnose it with AI?`,
      options,
    });

    if (isCancel(choice) || choice === 'no') {
      copyPasteNote();
      return;
    }

    if (choice === 'extension') {
      try {
        await open(buildExtensionUrl(pointer));
        note(
          'Opening Claude Code in VSCode — review the pre-filled prompt and press Enter.',
          'AI diagnosis'
        );
      } catch {
        copyPasteNote();
      }
      return;
    }

    if (choice === 'terminal') {
      await runTerminalDiagnosis(pointer);
    }
  } catch {
    // Never let the handoff mask the original failure.
  }
};
