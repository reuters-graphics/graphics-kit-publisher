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

  it('redacts PEM private key blocks', () => {
    const pem =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIabc\nDEFghi\n-----END RSA PRIVATE KEY-----';
    const out = redactSecrets(`key:\n${pem}\ndone`);
    expect(out).not.toContain('MIIabc');
    expect(out).toContain('[redacted]');
  });

  it('redacts known provider token shapes', () => {
    expect(redactSecrets('AKIAIOSFODNN7EXAMPLE')).toBe('[redacted]');
    expect(redactSecrets('ghp_0123456789abcdefghijklmnopqrstuvwxyz')).toBe(
      '[redacted]'
    );
    expect(redactSecrets('xoxb-123456789012-abcdefghijkl')).toBe('[redacted]');
    expect(redactSecrets('AIzaSyA1234567890abcdefghijklmnopqrstuv')).toBe(
      '[redacted]'
    );
  });

  it('redacts credentials embedded in URLs', () => {
    const out = redactSecrets(
      'postgres://admin:s3cr3tpw@db.example.com:5432/x'
    );
    expect(out).not.toContain('s3cr3tpw');
    expect(out).toContain('://[redacted]@db.example.com');
  });

  it('leaves ordinary text, file paths, and non-credential prose intact', () => {
    const text = 'Build failed at /Users/me/project/src/index.ts line 42';
    expect(redactSecrets(text)).toBe(text);
    // "Token" is no longer treated as an auth scheme
    expect(redactSecrets('Token expired at noon')).toBe(
      'Token expired at noon'
    );
  });
});
