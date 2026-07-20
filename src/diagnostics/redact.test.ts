import { describe, it, expect } from 'vitest';
import { redactSecrets } from './redact';

describe('redactSecrets', () => {
  it('redacts JWTs', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
    const out = redactSecrets(`token is ${jwt} ok`);
    expect(out).not.toContain(jwt);
    expect(out).toContain('[redacted]');
  });

  it('redacts sensitive key/value pairs', () => {
    expect(redactSecrets('password="hunter2secret"')).not.toContain(
      'hunter2secret'
    );
    expect(redactSecrets('"apiKey": "abcdef123456xyz"')).not.toContain(
      'abcdef123456xyz'
    );
    expect(redactSecrets('token=supersecretvalue')).toContain('[redacted]');
  });

  it('redacts long opaque tokens', () => {
    const token = 'A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0';
    expect(redactSecrets(token)).toBe('[redacted]');
  });

  it('leaves ordinary text and file paths intact', () => {
    const text = 'Build failed at /Users/me/project/src/index.ts line 42';
    expect(redactSecrets(text)).toBe(text);
  });
});
