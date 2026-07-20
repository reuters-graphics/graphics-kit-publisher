const REDACTED = '[redacted]';

/**
 * Scrub secret-looking strings from text before it is written to the
 * diagnostics file. Log output (especially from auth / server paths) can contain
 * tokens or credentials, and the diagnostics file is intended to be shared.
 *
 * Deliberately conservative about paths: the long-opaque-token pass excludes the
 * `/` separator so file paths (useful for diagnosis) are not eaten.
 */
export function redactSecrets(input: string): string {
  let out = input;

  // JWTs: header.payload.signature (base64url segments)
  out = out.replace(
    /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g,
    REDACTED
  );

  // Authorization schemes: Bearer / Basic / Token <credential>
  out = out.replace(
    /\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]+/gi,
    (_match, scheme: string) => `${scheme} ${REDACTED}`
  );

  // Sensitive key/value pairs: `token: "…"`, `apiKey=…`, `"password": "…"`, etc.
  out = out.replace(
    /((?:authorization|auth|api[_-]?key|access[_-]?key|token|secret|password|passwd|pwd)["']?\s*[:=]\s*)(["']?)[^\s"',}]+(["']?)/gi,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${REDACTED}${quote}`
  );

  // Long opaque tokens (base64/hex runs, no path separators so we keep file paths)
  out = out.replace(/\b[A-Za-z0-9+_-]{40,}={0,2}\b/g, REDACTED);

  return out;
}
