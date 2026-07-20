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

  it('falls back to the first N lines when nothing matches', () => {
    const out = extractLikelyErrors('line one\nline two\nline three', {
      maxLines: 2,
    });
    expect(out.length).toBeLessThanOrEqual(2);
    expect(out[0]).toBe('line one');
  });
});
