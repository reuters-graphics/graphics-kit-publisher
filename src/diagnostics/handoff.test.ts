import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import {
  isAiEnabled,
  detectSurfaces,
  buildPointer,
  buildExtensionUrl,
  isClaudeOnPath,
} from './handoff';

describe('isAiEnabled', () => {
  it('is enabled by default (config "prompt", no flag)', () => {
    expect(isAiEnabled({ configAi: 'prompt', argv: [] })).toBe(true);
  });

  it('is disabled by --no-ai', () => {
    expect(isAiEnabled({ configAi: 'prompt', argv: ['--no-ai'] })).toBe(false);
  });

  it('is disabled by ai: "off" config', () => {
    expect(isAiEnabled({ configAi: 'off', argv: [] })).toBe(false);
  });
});

describe('detectSurfaces', () => {
  it('offers the extension only in a VSCode integrated terminal', () => {
    expect(
      detectSurfaces({ termProgram: 'vscode', claudeOnPath: false }).extension
    ).toBe(true);
    expect(
      detectSurfaces({ termProgram: 'Apple_Terminal', claudeOnPath: false })
        .extension
    ).toBe(false);
  });

  it('offers the terminal only when claude is on PATH', () => {
    expect(
      detectSurfaces({ termProgram: '', claudeOnPath: true }).terminal
    ).toBe(true);
    expect(
      detectSurfaces({ termProgram: '', claudeOnPath: false }).terminal
    ).toBe(false);
  });
});

describe('buildPointer', () => {
  it('names the command when present', () => {
    expect(buildPointer('/p/latest.md', 'upload')).toBe(
      'Read /p/latest.md and diagnose the "upload" failure.'
    );
  });

  it('omits the command when absent', () => {
    expect(buildPointer('/p/latest.md')).toBe(
      'Read /p/latest.md and diagnose the failure.'
    );
  });
});

describe('buildExtensionUrl', () => {
  it('builds a url-encoded vscode deep-link', () => {
    const url = buildExtensionUrl('Read /p/latest.md and diagnose.');
    expect(url.startsWith('vscode://anthropic.claude-code/open?prompt=')).toBe(
      true
    );
    expect(url).toContain('%2Fp%2Flatest.md'); // path is encoded
    expect(url).not.toContain(' '); // spaces encoded
  });
});

describe('isClaudeOnPath', () => {
  const origPath = process.env.PATH;
  afterEach(() => {
    mockFs.restore();
    process.env.PATH = origPath;
  });

  it('is true when an executable claude is on PATH', () => {
    process.env.PATH = '/fake/bin';
    mockFs({ '/fake/bin/claude': mockFs.file({ mode: 0o755, content: '' }) });
    expect(isClaudeOnPath()).toBe(true);
  });

  it('is false when claude is not on PATH', () => {
    process.env.PATH = '/fake/bin';
    mockFs({ '/fake/bin/other': mockFs.file({ mode: 0o755, content: '' }) });
    expect(isClaudeOnPath()).toBe(false);
  });
});
