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
  // SvelteKit prerender (adapter-static)
  /prerender/i,
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

    // A line points at the user's own code if it names their src/ tree, a
    // `.svelte` file, or a `file.ext:line` location — but not if it's inside
    // node_modules (that's dependency noise, not their bug).
    const inNodeModules = /node_modules/.test(line);
    const referencesProject =
      !inNodeModules &&
      ((!!cwd && line.includes(cwd)) ||
        /(^|[^\w])src[\\/]/.test(line) ||
        /\.svelte\b/.test(line) ||
        /\.(?:svelte|ts|js|mjs|scss|css):\d+/.test(line));
    // Lower score is better; a project reference strongly outranks signature order.
    const score =
      signatureRank - (referencesProject ? PROJECT_REFERENCE_BOOST : 0);
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

  // Return a small window around the best match (one line of lead-in for context).
  const start = Math.max(0, bestIndex - 1);
  const end = Math.min(lines.length, start + maxLines);
  return reflowText(lines.slice(start, end).join('\n'), width);
}
