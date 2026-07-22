import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from 'node:child_process';
import { select, isCancel } from '@clack/prompts';
import { note, spinner } from '@reuters-graphics/clack';
import picocolors from 'picocolors';
import open from 'open';
import { utils } from '@reuters-graphics/graphics-bin';
import { context } from '../context';
import { reflowText } from '../utils/reflowText';
import { renderMarkdownForTerminal } from './renderMarkdown';

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
  /** A `claude` CLI we can actually spawn is available. */
  terminal: boolean;
}

/**
 * Which Claude Code surfaces are available — availability only, not credentials.
 */
export const detectSurfaces = (
  opts: { termProgram?: string; claudeBin?: string | null } = {}
): Surfaces => {
  const termProgram = opts.termProgram ?? process.env.TERM_PROGRAM;
  const claudeBin =
    opts.claudeBin !== undefined ? opts.claudeBin : resolveClaudeBin();
  return { extension: termProgram === 'vscode', terminal: !!claudeBin };
};

/** The short prompt handed to Claude — points at the file, never inlines it. */
export const buildPointer = (
  diagnosticsPath: string,
  command?: string
): string =>
  `Read ${diagnosticsPath} and diagnose the ${command ? `"${command}" ` : ''}failure.`;

/**
 * The prompt for the terminal `claude -p` diagnosis. It's the same pointer plus
 * output guidance for a one-shot, non-interactive render — the VSCode extension
 * opens a chat (Markdown renders, the user can reply) and keeps the plain
 * pointer, so this adapts *only* the terminal surface without touching the
 * shared diagnostics file.
 */
export const buildTerminalPrompt = (
  diagnosticsPath: string,
  command?: string
): string =>
  buildPointer(diagnosticsPath, command) +
  '\n\nYour reply is printed directly into a terminal as a single, ' +
  'non-interactive `claude -p` turn — this is not a chat, and the user cannot ' +
  'reply. So: keep it concise; reference files as `path:line`, not Markdown ' +
  'links; use only light Markdown (short headings, **bold**, `code`, and ' +
  'hyphen bullets); and end with the concrete fix — do not ask a question or ' +
  'offer to make the edit yourself.';

/** The VSCode extension deep-link that pre-fills (but does not submit) the prompt. */
export const buildExtensionUrl = (pointer: string): string =>
  `vscode://anthropic.claude-code/open?prompt=${encodeURIComponent(pointer)}`;

/**
 * The styled select-prompt question — one source of truth for both wordings.
 * The automatic prompt fires right after a command failed, so it names that
 * command; the `diagnose` command (`reopened`) re-opens the last failure on
 * demand, so it must not claim `diagnose` itself failed.
 *
 * The command name and "AI" are coloured to draw the eye, and the whole line is
 * bold behind a ⛔ so this one interactive decision point stands out from the
 * error output above and the options below. (⛔ is a single-codepoint,
 * default-emoji glyph, so it keeps a consistent 2-cell width across terminals,
 * unlike ⚠️, which needs a variation selector.) The trailing newline gives the
 * question breathing room from the option list.
 */
export const buildPromptMessage = (
  opts: { command?: string; reopened?: boolean } = {}
): string => {
  const ai = picocolors.yellow('AI');
  const question =
    opts.reopened ?
      `Diagnose the last failed command with ${ai}?`
    : `Your "${picocolors.cyan(opts.command ?? 'command')}" command failed. Diagnose it with ${ai}?`;
  return `${picocolors.bold(`⛔ ${question}`)}\n`;
};

/**
 * Whether a real `claude` executable is on PATH. A shell *alias* is not found —
 * correct, since `spawn` can't use aliases either (see {@link resolveClaudeBin}
 * for the native-installer location that aliases point at).
 */
export const isClaudeOnPath = (opts: { path?: string } = {}): boolean => {
  const envPath = opts.path ?? process.env.PATH;
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

/**
 * Resolve a `claude` command we can actually {@link spawn}: the bare name when
 * it's a real executable on PATH, otherwise the absolute path to the native
 * installer's binary at `~/.claude/local/claude`.
 *
 * The native installer exposes Claude only through a shell *alias* pointing at
 * that path — invisible to PATH and to `spawn`, so a PATH scan alone reports
 * "not available" for those users even though Claude is installed. Checking the
 * known location (and returning the absolute path for the caller to spawn) is
 * what makes the terminal handoff appear for them. Returns null when neither is
 * found.
 */
export const resolveClaudeBin = (
  opts: { path?: string; home?: string; platform?: NodeJS.Platform } = {}
): string | null => {
  if (isClaudeOnPath({ path: opts.path })) return 'claude';

  const home = opts.home ?? os.homedir();
  const platform = opts.platform ?? process.platform;
  const names =
    platform === 'win32' ? ['claude.exe', 'claude.cmd', 'claude'] : ['claude'];
  for (const name of names) {
    const candidate = path.join(home, '.claude', 'local', name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // not the native-installer location
    }
  }
  return null;
};

/* ------------------------------------------------------------------ */
/* Interactive handoff                                                 */
/* ------------------------------------------------------------------ */

const isInteractive = (): boolean =>
  !utils.environment.isCiEnvironment() &&
  !!process.stdout.isTTY &&
  !!process.stdin.isTTY;

/** Content width for a note: terminal width minus box chrome, capped for readability. */
const noteWidth = (): number =>
  Math.max(40, Math.min(process.stdout.columns ?? 80, 100) - 6);

/**
 * Print a note, word-wrapping the message to the terminal width first. `note`
 * sizes its box to the longest line and does not wrap, so an LLM's long
 * unwrapped paragraph lines would otherwise blow the box past the terminal.
 */
const reflowedNote = (message: string, title: string): void => {
  note(reflowText(message, noteWidth()).join('\n'), title);
};

/**
 * Run a one-shot `claude -p` diagnosis. Shows a spinner while Claude works so
 * the terminal doesn't look hung, and captures both streams.
 *
 * On success (exit 0 with output) it prints the diagnosis and drops stderr —
 * Claude emits operational notices there (e.g. auth/connector warnings) that
 * are just noise on the happy path. On failure it surfaces the captured stderr
 * so a real problem (an auth error, say) isn't silently swallowed. Resolves
 * true when a diagnosis was produced; never rejects.
 */
const runTerminalDiagnosis = (pointer: string, bin: string): Promise<boolean> =>
  new Promise((resolve) => {
    const s = spinner(2000);
    s.start('Asking Claude to look at the error');

    const out: Buffer[] = [];
    const err: Buffer[] = [];
    const child = spawn(bin, ['-p', pointer, '--output-format', 'text'], {
      cwd: context.cwd,
      // Capture both streams (the spinner owns the parent terminal); we decide
      // what to surface once we know the exit code.
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout?.on('data', (chunk: Buffer) => out.push(chunk));
    child.stderr?.on('data', (chunk: Buffer) => err.push(chunk));

    child.on('close', async (code) => {
      const text = Buffer.concat(out).toString('utf8').trim();
      if (code === 0 && text) {
        await s.stop('Claude looked at your error:');
        // Claude replies in Markdown; render it to coloured terminal text
        // rather than dumping raw ##/**/[]() syntax into the note.
        note(renderMarkdownForTerminal(text, noteWidth()), 'AI diagnosis');
        resolve(true);
      } else {
        await s.stop("Claude couldn't diagnose the error.");
        const errText = Buffer.concat(err).toString('utf8').trim();
        if (errText) reflowedNote(errText, 'Claude error');
        resolve(false);
      }
    });

    child.on('error', async () => {
      await s.stop("Couldn't run Claude.");
      resolve(false);
    });
  });

/**
 * After a failure, offer to hand the diagnostics file off to Claude Code — the
 * VSCode extension (chat next to the code) or a one-shot `claude -p` in the
 * terminal. Best-effort and never throws; returns without prompting when a
 * handoff isn't possible (disabled, non-interactive, or nothing available).
 *
 * Resolves `true` only when a diagnosis was printed *to this terminal* (the
 * `claude -p` path). The caller does NOT use this to change the exit code — the
 * command still failed and must exit non-zero so script runners (e.g.
 * npm-run-all) halt and CI fails — but to frame the runner's trailing error,
 * which only makes sense when the diagnosis is right there above it. The
 * extension path opens the diagnosis in VSCode, not the terminal, so it
 * resolves `false`.
 */
export const offerDiagnosisHandoff = async ({
  diagnosticsPath,
  command,
  force = false,
}: HandoffOptions): Promise<boolean> => {
  try {
    if (!diagnosticsPath || !isInteractive()) return false;
    if (!force && !isAiEnabled()) return false;

    const claudeBin = resolveClaudeBin();
    const surfaces = detectSurfaces({ claudeBin });
    const pointer = buildPointer(diagnosticsPath, command);
    const copyPasteNote = () =>
      note(
        `Diagnose later with:\n${picocolors.cyan(`claude "$(cat ${diagnosticsPath})"`)}`,
        'AI diagnosis'
      );

    if (!surfaces.extension && !surfaces.terminal) {
      copyPasteNote();
      return false;
    }

    const options: { value: string; label: string; hint?: string }[] = [];
    if (surfaces.extension)
      options.push({
        value: 'extension',
        label: 'Open a Claude Code chat to fix it',
        hint: 'in VSCode',
      });
    if (surfaces.terminal)
      options.push({
        value: 'terminal',
        label: 'Just tell me what went wrong',
        hint: 'in terminal',
      });
    options.push({ value: 'no', label: 'No thanks' });

    const choice = await select({
      message: buildPromptMessage({ command, reopened: force }),
      options,
    });

    if (isCancel(choice) || choice === 'no') {
      copyPasteNote();
      return false;
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
      // The diagnosis opens in VSCode, not this terminal, so there's nothing
      // above the runner's error to frame — resolve false either way.
      return false;
    }

    if (choice === 'terminal' && claudeBin) {
      // Terminal-specific prompt (one-shot, no Markdown links, no closing
      // question); the extension above keeps the plain `pointer`.
      const ok = await runTerminalDiagnosis(
        buildTerminalPrompt(diagnosticsPath, command),
        claudeBin
      );
      if (!ok) copyPasteNote();
      return ok;
    }

    return false;
  } catch {
    // Never let the handoff mask the original failure.
    return false;
  }
};
