import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import { projectDir, setProject, type ProjectFiles } from '../__test__/project';

vi.mock('../context', () => ({
  context: {
    // The harness runs each test file from its own temp project directory.
    cwd: process.cwd(),
    config: { build: { outDir: 'dist/' } },
    pkgMgr: { name: 'pnpm', agent: 'pnpm' },
  },
}));
vi.mock('@reuters-graphics/clack', () => ({ note: vi.fn() }));

import { writeDiagnostics } from './index';
import { BuildError, PageMetadataError } from '../exceptions/errors';
import { note } from '@reuters-graphics/clack';

const LATEST = path.join(projectDir, '.graphics-kit/diagnostics/latest.md');

const buildErr = () =>
  new BuildError('App failed to build', {
    code: 'BUILD_FAILED',
    logPaths: [path.join(projectDir, '.graphics-kit/logs/error.log')],
    hint: 'See the logs',
  });

const projectFs = (opts: {
  gitignore?: string;
  git?: boolean;
}): ProjectFiles => {
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
  return project as ProjectFiles;
};

describe('writeDiagnostics', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const GITIGNORE = path.join(projectDir, '.gitignore');

  it('writes latest.md when .graphics-kit is already git-ignored (no .gitignore edit)', () => {
    setProject(projectFs({ gitignore: '.graphics-kit/\nnode_modules/' }));

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
    // already ignored → no edit, no note
    expect(fs.readFileSync(GITIGNORE, 'utf8')).toBe(
      '.graphics-kit/\nnode_modules/'
    );
    expect(note).not.toHaveBeenCalled();
  });

  it('appends .graphics-kit/ to .gitignore when not yet ignored, then writes', () => {
    setProject(projectFs({ gitignore: 'node_modules/' }));

    const written = writeDiagnostics(buildErr(), 'upload');

    expect(written).toBe(LATEST);
    expect(fs.existsSync(LATEST)).toBe(true);
    expect(fs.readFileSync(GITIGNORE, 'utf8')).toContain('.graphics-kit/');
    expect(note).toHaveBeenCalled();
  });

  it('creates a .gitignore when the git repo has none, then writes', () => {
    setProject(projectFs({ gitignore: undefined }));

    const written = writeDiagnostics(buildErr(), 'publish');

    expect(written).toBe(LATEST);
    expect(fs.existsSync(GITIGNORE)).toBe(true);
    expect(fs.readFileSync(GITIGNORE, 'utf8')).toContain('.graphics-kit/');
  });

  it('writes anyway when not in a git repo (no .gitignore created)', () => {
    setProject(projectFs({ git: false }));

    const written = writeDiagnostics(buildErr(), 'preview');

    expect(written).toBe(LATEST);
    expect(fs.existsSync(LATEST)).toBe(true);
    expect(fs.existsSync(GITIGNORE)).toBe(false);
  });

  it('omits build logs for an internal rule error (no logPaths)', () => {
    // The build succeeded; the failure was thrown by a publisher rule. The
    // build logs on disk are unrelated noise and must not be surfaced.
    setProject(projectFs({ gitignore: '.graphics-kit/\n' }));

    const ruleErr = new PageMetadataError(
      'No "og:image" tag found in map.html',
      {
        code: 'MISSING_OG_IMAGE',
        hint: 'Add an <meta property="og:image"> tag to the page.',
      }
    );
    const written = writeDiagnostics(ruleErr, 'upload');

    const content = fs.readFileSync(written!, 'utf8');
    // The self-describing error still leads the diagnosis...
    expect(content).toContain('MISSING_OG_IMAGE');
    // ...but the build logs and scraped "likely cause" are gone.
    expect(content).not.toContain('Likely cause');
    expect(content).not.toContain('Log: error.log');
    expect(content).not.toContain('Log: out.log');
  });
});
