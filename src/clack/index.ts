import { stripVTControlCharacters as strip } from 'node:util';
import isUnicodeSupported from 'is-unicode-supported';
import color from 'picocolors';

const unicode = isUnicodeSupported();
const s = (c: string, fallback: string) => (unicode ? c : fallback);
const S_STEP_SUBMIT = s('◇', 'o');

const S_BAR_START = s('┌', 'T');
const S_BAR = s('│', '|');

const S_BAR_H = s('─', '-');
const S_CORNER_TOP_RIGHT = s('╮', '+');
const S_CONNECT_LEFT = s('├', '+');
const S_CORNER_BOTTOM_RIGHT = s('╯', '+');

export const intro = (title = '') => {
  process.stdout.write(
    `${color.gray(S_BAR_START)}  ${color.bgCyan(` ${title} `)}\n`
  );
};

export const note = (message = '', title = '') => {
  const lines = `\n${message}\n`.split('\n');
  const titleLen = strip(title).length;
  const len =
    Math.max(
      lines.reduce((sum, ln) => {
        const line = strip(ln);
        return line.length > sum ? line.length : sum;
      }, 0),
      titleLen
    ) + 2;
  const msg = lines
    .map(
      (ln) =>
        `${color.gray(S_BAR)}  ${ln}${' '.repeat(len - strip(ln).length)}${color.gray(
          S_BAR
        )}`
    )
    .join('\n');
  process.stdout.write(
    `${color.gray(S_BAR)}\n${color.green(S_STEP_SUBMIT)}  ${color.reset(title)} ${color.gray(
      S_BAR_H.repeat(Math.max(len - titleLen - 1, 1)) + S_CORNER_TOP_RIGHT
    )}\n${msg}\n${color.gray(S_CONNECT_LEFT + S_BAR_H.repeat(len + 2) + S_CORNER_BOTTOM_RIGHT)}\n`
  );
};
