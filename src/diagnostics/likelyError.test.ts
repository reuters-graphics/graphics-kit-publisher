import { describe, it, expect } from 'vitest';
import { extractLikelyErrors } from './likelyError';

describe('extractLikelyErrors', () => {
  it('returns an empty array for empty input', () => {
    expect(extractLikelyErrors('')).toEqual([]);
    expect(extractLikelyErrors('   \n  ')).toEqual([]);
  });

  it('surfaces a TypeScript error line', () => {
    const log = [
      '> build',
      'transforming...',
      "src/App.svelte:12:3: error TS2304: Cannot find name 'foo'.",
      'done',
    ].join('\n');
    expect(extractLikelyErrors(log, { cwd: '/proj' }).join('\n')).toContain(
      'error TS2304'
    );
  });

  it('prefers a line referencing the project src over an earlier generic error', () => {
    const log = [
      'Error: something generic in a dependency',
      'at node_modules/x/index.js',
      'src/routes/+page.svelte: Failed to resolve import "./missing"',
    ].join('\n');
    expect(extractLikelyErrors(log, { cwd: '/proj' }).join('\n')).toContain(
      'src/routes/+page.svelte'
    );
  });

  it('surfaces a vite-plugin-svelte compile error over surrounding noise', () => {
    const log = [
      'vite v8.1.4 building for production...',
      'transforming (243) src/lib/Foo.svelte',
      '[plugin:vite-plugin-svelte] src/lib/Chart.svelte:20:4 `$props` is not defined',
      'error during build:',
    ].join('\n');
    expect(extractLikelyErrors(log).join('\n')).toContain('Chart.svelte:20:4');
  });

  it('surfaces a SassError with its file location', () => {
    const log = [
      'rendering chunks...',
      "src/lib/styles/app.scss:4:1: SassError: Can't find stylesheet to import.",
      'x Build failed',
    ].join('\n');
    expect(extractLikelyErrors(log).join('\n')).toContain('SassError');
  });

  it('ignores node_modules lines when a project line is also present', () => {
    const log = [
      'node_modules/some-dep/dist/index.js: SyntaxError: Unexpected token',
      'src/routes/+page.ts:3:10: SyntaxError: Unexpected token',
    ].join('\n');
    expect(extractLikelyErrors(log).join('\n')).toContain('+page.ts:3:10');
  });

  it('falls back to the first N lines when nothing matches', () => {
    const out = extractLikelyErrors('line one\nline two\nline three', {
      maxLines: 2,
    });
    expect(out.length).toBeLessThanOrEqual(2);
    expect(out[0]).toBe('line one');
  });
});
