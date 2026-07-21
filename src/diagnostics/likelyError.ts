import { reflowText } from '../utils/reflowText';

/**
 * Ranked toolchain error signatures. Earlier entries are higher priority — when
 * several lines match, the one matching an earlier signature wins.
 *
 * Tuned for the stack the publisher actually builds: `vite build` over a
 * SvelteKit 2 / Svelte 5 / sass project (the bluprint_graphics-kit template).
 * Ordered specific → generic so a Svelte/sass/Rollup error outranks a bare
 * `Error:` line.
 */
const ERROR_SIGNATURES: RegExp[] = [
  // Svelte compiler (surfaced through vite-plugin-svelte)
  /\[plugin:vite-plugin-svelte\]/i,
  /\bCompileError\b/,
  // Sass / PostCSS
  /\bSassError\b/i,
  /\[sass\]/i,
  /Failed to load PostCSS/i,
  /\[postcss\]/i,
  // Vite / Rollup / esbuild build failures
  /failed to resolve import/i,
  /Could not resolve/i,
  /\bRollupError\b/,
  /✘ \[ERROR\]/, // esbuild
  /Transform failed/i,
  // Node / module resolution
  /Cannot find module/i,
  /ERR_MODULE_NOT_FOUND/,
  /Cannot find package/i,
  /\bENOENT\b/,
  // NOTE: we deliberately do NOT match SvelteKit's prerender HTTP-error
  // wrapper (`Error: <code> /route` + the `handleHttpError` / `#prerender`
  // advice line). When a page throws during prerender, SvelteKit always wraps
  // the failure in that wrapper — it's a symptom, and the real error (a
  // ReferenceError, etc.) is printed just above it. Leaving the wrapper
  // unmatched lets the actual thrown error win. A genuine prerender *config*
  // error still starts with `Error:` and is caught by the generic fallback.
  // TypeScript (rare in `vite build`, but cheap to keep)
  /error TS\d+/i,
  // Generic JS runtime/syntax
  /\bReferenceError\b/,
  /\bSyntaxError\b/,
  /\bTypeError\b/,
  /is not defined\b/,
  /is not exported\b/,
  /Unexpected (?:token|end|EOF)/i,
  // Low-signal fallbacks
  /error during build:/i,
  /\[vite[:\]-]/i,
  /\[rollup\]/i,
  /ELIFECYCLE/i,
  /npm ERR!/i,
  /\bERR!/,
  /\bError:/,
  /\bfailed\b/i,
];

/** Boost applied to a line that references the user's own project source. */
const PROJECT_REFERENCE_BOOST = 100;

/**
 * Penalty applied when an error's entire associated stack trace sits inside
 * `node_modules` — dependency-internal noise that should lose to anything
 * pointing at the user's own code.
 */
const NODE_MODULES_PENALTY = 50;

/** A stack-trace frame line, e.g. `    at foo (file:///…/x.js:1:2)`. */
function isStackFrame(line: string): boolean {
  return /^\s*at\s/.test(line) || /\bfile:\/\//.test(line);
}

/**
 * Whether a single line points at the user's own code: it names their `src/`
 * tree, a `.svelte` file, a `file.ext:line` location, or (when known) the
 * project root — but never a `node_modules` path (that's dependency noise,
 * and the guard also stops a `.../node_modules/.../src/...` false positive).
 */
function referencesProjectLine(line: string, cwd?: string): boolean {
  if (/node_modules/.test(line)) return false;
  return (
    (!!cwd && line.includes(cwd)) ||
    /(^|[^\w])src[\\/]/.test(line) ||
    /\.svelte\b/.test(line) ||
    /\.(?:svelte|ts|js|mjs|scss|css):\d+/.test(line)
  );
}

export interface ExtractLikelyErrorsOptions {
  /** Absolute project root; lines mentioning it are preferred. */
  cwd?: string;
  /** Max number of lines in the returned window. */
  maxLines?: number;
  /** Reflow width. */
  width?: number;
}

/**
 * Heuristically surface the most probable error from captured subprocess output
 * (e.g. a build's stderr). Prefers lines matching a known error signature,
 * strongly favouring lines that reference the user's own project, and returns a
 * small window of context around the best match.
 *
 * Falls back to the first N non-empty lines when nothing matches — never worse
 * than dumping the head of the log.
 */
export function extractLikelyErrors(
  logText: string,
  options: ExtractLikelyErrorsOptions = {}
): string[] {
  const { cwd, maxLines = 8, width = 100 } = options;
  const text = logText.trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);

  let bestIndex = -1;
  let bestScore = Infinity;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const signatureRank = ERROR_SIGNATURES.findIndex((re) => re.test(line));
    if (signatureRank === -1) continue;

    // Associate the contiguous stack-trace block beneath this line with it, so
    // a bare error header ("ReferenceError: x is not defined") inherits the
    // project signal from its frames — the decisive clue for whether the fault
    // is in the user's code or a dependency.
    const trace: string[] = [];
    for (let j = i + 1; j < lines.length && isStackFrame(lines[j]); j++) {
      trace.push(lines[j]);
    }

    // The error points at the user's own code if the header or any of its
    // frames does; it's dependency noise if it has a trace and every frame
    // lives in node_modules.
    const referencesProject =
      referencesProjectLine(line, cwd) ||
      trace.some((frame) => referencesProjectLine(frame, cwd));
    const allFramesInNodeModules =
      trace.length > 0 && trace.every((frame) => /node_modules/.test(frame));

    // Lower score is better; a project reference strongly outranks signature
    // order, while an all-node_modules trace is demoted below it.
    let score = signatureRank;
    if (referencesProject) score -= PROJECT_REFERENCE_BOOST;
    else if (allFramesInNodeModules) score += NODE_MODULES_PENALTY;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Fallback: first N non-empty lines (previous formatErrorConsoleLog behavior).
  if (bestIndex === -1) {
    return reflowText(text, width)
      .filter((line) => line.trim().length > 0)
      .slice(0, maxLines);
  }

  // Return a small window around the best match (one line of lead-in for
  // context), capped at maxLines. Stop at the first blank line after the match:
  // build logs use blank lines to delimit separate error blocks, so this keeps
  // the window from bleeding into an unrelated downstream error (e.g. the
  // SvelteKit prerender wrapper printed below a page's thrown error).
  const start = Math.max(0, bestIndex - 1);
  let end = Math.min(lines.length, start + maxLines);
  for (let i = bestIndex + 1; i < end; i++) {
    if (lines[i].trim().length === 0) {
      end = i;
      break;
    }
  }
  return reflowText(lines.slice(start, end).join('\n'), width);
}
