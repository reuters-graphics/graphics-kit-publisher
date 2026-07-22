import { describe, it, expect, afterEach } from 'vitest';
import mockFs from 'mock-fs';
import {
  isAiEnabled,
  detectSurfaces,
  buildPointer,
  buildTerminalPrompt,
  buildExtensionUrl,
  buildPromptMessage,
  isClaudeOnPath,
  resolveClaudeBin,
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
      detectSurfaces({ termProgram: 'vscode', claudeBin: null }).extension
    ).toBe(true);
    expect(
      detectSurfaces({ termProgram: 'Apple_Terminal', claudeBin: null })
        .extension
    ).toBe(false);
  });

  it('offers the terminal only when a spawnable claude was resolved', () => {
    expect(
      detectSurfaces({ termProgram: '', claudeBin: '/usr/local/bin/claude' })
        .terminal
    ).toBe(true);
    expect(detectSurfaces({ termProgram: '', claudeBin: null }).terminal).toBe(
      false
    );
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

describe('buildTerminalPrompt', () => {
  it('keeps the base pointer and appends terminal-only output guidance', () => {
    const prompt = buildTerminalPrompt('/p/latest.md', 'upload');
    // still points Claude at the same diagnostics file
    expect(prompt).toContain(buildPointer('/p/latest.md', 'upload'));
    // adapts the output for a one-shot, non-interactive terminal render
    expect(prompt).toContain('path:line');
    expect(prompt).toContain('do not ask a question');
    expect(prompt).toMatch(/not a chat/i);
  });
});

describe('buildPromptMessage', () => {
  // The message is styled (bold + colour); assert on the semantic text so the
  // tests hold whether or not colour is enabled in the run environment.
  // eslint-disable-next-line no-control-regex
  const stripAnsi = (s: string): string => s.replace(/\x1b\[[0-9;]*m/g, '');

  it('names the failed command for the automatic post-failure prompt', () => {
    expect(stripAnsi(buildPromptMessage({ command: 'preview' }))).toContain(
      'Your "preview" command failed. Diagnose it with AI?'
    );
  });

  it('does not claim a failure when re-opened via the diagnose command', () => {
    const out = stripAnsi(
      buildPromptMessage({ command: 'diagnose', reopened: true })
    );
    expect(out).toContain('Diagnose the last failed command with AI?');
    expect(out).not.toContain('"diagnose" command failed');
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

describe('resolveClaudeBin', () => {
  afterEach(() => mockFs.restore());

  it('returns the bare name when claude is a real executable on PATH', () => {
    mockFs({ '/fake/bin/claude': mockFs.file({ mode: 0o755, content: '' }) });
    expect(resolveClaudeBin({ path: '/fake/bin', home: '/home/me' })).toBe(
      'claude'
    );
  });

  it('falls back to the native-installer path when only the alias target exists', () => {
    // The common native-install case: nothing on PATH, but the executable
    // lives at ~/.claude/local/claude (exposed to the shell only via an alias).
    mockFs({
      '/home/me/.claude/local/claude': mockFs.file({
        mode: 0o755,
        content: '',
      }),
    });
    expect(
      resolveClaudeBin({ path: '/empty', home: '/home/me', platform: 'darwin' })
    ).toBe('/home/me/.claude/local/claude');
  });

  it('returns null when claude is neither on PATH nor in the native location', () => {
    mockFs({ '/home/me/.claude/local/other': mockFs.file({ mode: 0o755 }) });
    expect(
      resolveClaudeBin({ path: '/empty', home: '/home/me', platform: 'darwin' })
    ).toBeNull();
  });
});
