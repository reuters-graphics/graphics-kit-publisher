import { reflowText } from '../utils/reflowText';

/**
 * Ranked toolchain error signatures. Earlier entries are higher priority — when
 * several lines match, the one matching an earlier signature wins.
 */
const ERROR_SIGNATURES: RegExp[] = [
  /error TS\d+/i,
  /\bSyntaxError\b/,
  /Transform failed/i,
  /Failed to resolve import/i,
  /Cannot find module/i,
  /is not exported/i,
  /Unexpected token/i,
  /\bENOENT\b/,
  /\[vite\]/i,
  /\[rollup\]/i,
  /ELIFECYCLE/i,
  /npm ERR!/i,
  /\bERR!/i,
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

    const referencesProject =
      (!!cwd && line.includes(cwd)) || /(^|[^\w])src[\\/]/.test(line);
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
