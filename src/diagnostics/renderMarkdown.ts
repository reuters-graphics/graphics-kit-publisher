import picocolors from 'picocolors';
import { reflowText } from '../utils/reflowText';

/**
 * Resolve inline Markdown to terminal styling: links to their text, bold to
 * bold, inline code to cyan. Applied per already-wrapped line, so a token that
 * happens to straddle a wrap boundary is simply left as-is rather than mangled.
 */
const renderInline = (s: string): string =>
  s
    // [text](url) → text (drop the URL; terminals can't click it anyway)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    // **bold** / __bold__ → bold
    .replace(/\*\*([^*]+)\*\*/g, (_m, t) => picocolors.bold(t))
    .replace(/__([^_]+)__/g, (_m, t) => picocolors.bold(t))
    // `code` → cyan
    .replace(/`([^`]+)`/g, (_m, t) => picocolors.cyan(t));

/**
 * Render an LLM's Markdown answer as terminal-friendly text: colour and bold in
 * place of raw `##`/`**`/`[]()` syntax. Headings and bold become bold, inline
 * code and fenced code become cyan, links collapse to their text, and bullets
 * get a coloured •.
 *
 * The text is wrapped to `width` *first* (on the plain Markdown, so the width
 * math is right), then styled line by line — styling only strips syntax and
 * adds invisible ANSI, so no rendered line ends up wider than the wrap.
 */
export const renderMarkdownForTerminal = (md: string, width = 100): string => {
  const rendered: string[] = [];
  let inFence = false;

  for (const line of reflowText(md.trim(), width)) {
    // Fenced code: drop the ``` markers, colour the body, skip inline parsing.
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      rendered.push(picocolors.cyan(line));
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      rendered.push(
        picocolors.yellow(picocolors.bold(renderInline(heading[1])))
      );
      continue;
    }

    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (bullet) {
      rendered.push(
        `${bullet[1]}${picocolors.cyan('•')} ${renderInline(bullet[2])}`
      );
      continue;
    }

    rendered.push(renderInline(line));
  }

  return rendered.join('\n');
};
