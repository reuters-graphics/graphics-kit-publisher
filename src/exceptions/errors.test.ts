/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PublisherError, BuildError, handleError } from './errors';

describe('PublisherError', () => {
  it('defaults code to the class name and stores options', () => {
    const err = new BuildError('boom', {
      logPaths: ['/x/error.log'],
      hint: 'do x',
      context: { a: 1 },
    });
    expect(err).toBeInstanceOf(PublisherError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('BuildError');
    expect(err.code).toBe('BuildError');
    expect(err.logPaths).toEqual(['/x/error.log']);
    expect(err.hint).toBe('do x');
    expect(err.context).toEqual({ a: 1 });
  });

  it('uses an explicit code when provided', () => {
    expect(new BuildError('x', { code: 'BUILD_FAILED' }).code).toBe(
      'BUILD_FAILED'
    );
  });

  it('works with a message only (back-compatible)', () => {
    const err = new BuildError('just a message');
    expect(err.message).toBe('just a message');
    expect(err.code).toBe('BuildError');
    expect(err.hint).toBeUndefined();
  });
});

describe('handleError', () => {
  let exitSpy: any;
  let errSpy: any;

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('__exit__');
    }) as never);
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const output = () =>
    errSpy.mock.calls.map((c: any[]) => String(c[0])).join('\n');

  it('renders code, fix hint, and diagnostics pointer; hides the stack by default', () => {
    const err = new BuildError('App failed to build', {
      code: 'BUILD_FAILED',
      hint: 'See the logs',
    });
    expect(() =>
      handleError(err, {
        command: 'upload',
        diagnosticsPath: '/p/.graphics-kit/diagnostics/latest.md',
      })
    ).toThrow('__exit__');

    const out = output();
    expect(out).toContain('BUILD_FAILED');
    expect(out).toContain('Fix:');
    expect(out).toContain('See the logs');
    expect(out).toContain('latest.md');
    expect(out).not.toMatch(/\n\s+at /); // no stack frames
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('shows the stack when --verbose is set', () => {
    const original = process.argv;
    process.argv = [...original, '--verbose'];
    try {
      const err = new BuildError('App failed to build');
      expect(() => handleError(err)).toThrow('__exit__');
      expect(output()).toMatch(/\n\s+at /);
    } finally {
      process.argv = original;
    }
  });
});
