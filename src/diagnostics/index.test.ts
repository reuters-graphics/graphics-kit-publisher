import { describe, it, expect, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';
import fs from 'fs';
import path from 'path';

vi.mock('../context', () => ({
  context: {
    cwd: '/fake/project',
    config: { build: { outDir: 'dist/' } },
    pkgMgr: { name: 'pnpm', agent: 'pnpm' },
  },
}));
vi.mock('@reuters-graphics/clack', () => ({ note: vi.fn() }));

import { writeDiagnostics } from './index';
import { BuildError } from '../exceptions/errors';
import { note } from '@reuters-graphics/clack';

const LATEST = path.join(
  '/fake/project',
  '.graphics-kit/diagnostics/latest.md'
);

const buildErr = () =>
  new BuildError('App failed to build', {
    code: 'BUILD_FAILED',
    logPaths: ['/fake/project/.graphics-kit/logs/error.log'],
    hint: 'See the logs',
  });

const projectFs = (opts: {
  gitignore?: string;
  git?: boolean;
}): Parameters<typeof mockFs>[0] => {
  const project: Record<string, unknown> = {
    '.graphics-kit': {
      logs: {
        'error.log':
          'src/App.svelte: error TS2304: Cannot find name foo\ntoken=abcdef0123456789abcdef0123456789abcdef01',
        'out.log': 'built ok',
      },
    },
  };
  if (opts.git !== false) project['.git'] = { HEAD: 'ref: refs/heads/main' };
  if (opts.gitignore !== undefined) project['.gitignore'] = opts.gitignore;
  return { '/fake/project': project } as Parameters<typeof mockFs>[0];
};

describe('writeDiagnostics', () => {
  afterEach(() => {
    mockFs.restore();
    vi.clearAllMocks();
  });

  it('writes latest.md when .graphics-kit is git-ignored', () => {
    mockFs(projectFs({ gitignore: '.graphics-kit/\nnode_modules/' }));

    const written = writeDiagnostics(buildErr(), 'upload');

    expect(written).toBe(LATEST);
    const content = fs.readFileSync(LATEST, 'utf8');
    expect(content).toContain('# Publisher diagnostics');
    expect(content).toContain('BUILD_FAILED');
    expect(content).toContain('Command: upload');
    expect(content).toContain('Likely cause');
    // secret from the log tail is redacted
    expect(content).not.toContain('abcdef0123456789abcdef0123456789abcdef01');
    expect(content).toContain('[redacted]');
  });

  it('skips and warns when the path is not git-ignored', () => {
    mockFs(projectFs({ gitignore: 'node_modules/' }));

    const written = writeDiagnostics(buildErr(), 'upload');

    expect(written).toBeNull();
    expect(note).toHaveBeenCalled();
    expect(fs.existsSync(LATEST)).toBe(false);
  });

  it('writes anyway when not in a git repo', () => {
    mockFs(projectFs({ git: false }));

    const written = writeDiagnostics(buildErr(), 'preview');

    expect(written).toBe(LATEST);
    expect(fs.existsSync(LATEST)).toBe(true);
  });
});
