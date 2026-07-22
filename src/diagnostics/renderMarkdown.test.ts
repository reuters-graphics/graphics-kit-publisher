import { describe, it, expect } from 'vitest';
import { renderMarkdownForTerminal } from './renderMarkdown';

// Colour is disabled in the (non-TTY) test env, so assert on the semantic
// transformation — syntax stripped, text preserved — not on ANSI codes.
// eslint-disable-next-line no-control-regex
const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');

describe('renderMarkdownForTerminal', () => {
  it('turns a heading into text without the # markers', () => {
    const out = renderMarkdownForTerminal('## Diagnosis');
    expect(stripAnsi(out)).toBe('Diagnosis');
    expect(out).not.toContain('#');
  });

  it('styles **bold** and drops the asterisks', () => {
    const out = renderMarkdownForTerminal('The **root cause** is clear');
    expect(stripAnsi(out)).toBe('The root cause is clear');
    expect(out).not.toContain('**');
  });

  it('collapses a Markdown link to its text and drops the URL', () => {
    const out = renderMarkdownForTerminal(
      'See [page-building.md:84](node_modules/x/llms/page-building.md).'
    );
    const plain = stripAnsi(out);
    expect(plain).toContain('page-building.md:84');
    expect(plain).not.toContain('node_modules');
    expect(plain).not.toContain('](');
  });

  it('styles inline code and keeps its text', () => {
    const out = renderMarkdownForTerminal('Add the `SEO` component');
    expect(stripAnsi(out)).toBe('Add the SEO component');
    expect(out).not.toContain('`');
  });

  it('renders a bullet with a • and no leading dash', () => {
    const out = renderMarkdownForTerminal('- first item');
    const plain = stripAnsi(out);
    expect(plain).toContain('• first item');
    expect(plain).not.toMatch(/^\s*-\s/);
  });

  it('drops code-fence markers and keeps the code body', () => {
    const out = renderMarkdownForTerminal('```svelte\nconsole.log(x);\n```');
    const plain = stripAnsi(out);
    expect(plain).toContain('console.log(x);');
    expect(plain).not.toContain('```');
    expect(plain).not.toContain('svelte');
  });

  it('wraps long prose to the given width (visible width, ignoring ANSI)', () => {
    const long = `The ${'**map**'} embed ${'`+page.svelte`'} is missing the SEO component so no og image tag is emitted during the prerender pass here`;
    const out = renderMarkdownForTerminal(long, 40);
    for (const line of out.split('\n')) {
      expect(stripAnsi(line).length).toBeLessThanOrEqual(40);
    }
  });
});
