const REDACTED = '[redacted]';

/**
 * Scrub secret-looking strings from text before it is written to the
 * diagnostics file. Log output (especially from auth / server paths) can contain
 * tokens or credentials, and the diagnostics file is intended to be shared.
 *
 * Best-effort defence-in-depth — the primary protection is not capturing secrets
 * in the first place (e.g. credential errors store field names, not values). This
 * scrubs the one input we don't control: captured build/subprocess log tails.
 *
 * Deliberately conservative about paths: the long-opaque-token pass excludes the
 * `/` separator so file paths (useful for diagnosis) are not eaten.
 */
export function redactSecrets(input: string): string {
  let out = input;

  // PEM private key blocks (whole block, incl. RSA/EC/OPENSSH variants).
  out = out.replace(
    /-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z]+ )?PRIVATE KEY-----/g,
    REDACTED
  );

  // JWTs: header.payload.signature (base64url segments).
  out = out.replace(
    /eyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g,
    REDACTED
  );

  // Known provider token shapes — high signal, negligible false-positive risk.
  out = out.replace(/\bAKIA[0-9A-Z]{16}\b/g, REDACTED); // AWS access key id
  out = out.replace(/\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, REDACTED); // GitHub tokens
  out = out.replace(/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, REDACTED); // Slack tokens
  out = out.replace(/\bAIza[0-9A-Za-z_-]{35}\b/g, REDACTED); // Google API key

  // Authorization schemes: `Bearer <credential>` / `Basic <credential>`.
  // (No `Token` — it collides with ordinary prose like "Token expired".)
  out = out.replace(
    /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi,
    (_match, scheme: string) => `${scheme} ${REDACTED}`
  );

  // Credentials embedded in URLs: `scheme://user:pass@host`.
  out = out.replace(/:\/\/[^/\s:@]+:[^/\s:@]+@/g, `://${REDACTED}@`);

  // Sensitive key/value pairs: `token: "…"`, `apiKey=…`, `"password": "…"`, etc.
  out = out.replace(
    /((?:authorization|auth|api[_-]?key|access[_-]?key|token|secret|password|passwd|pwd)["']?\s*[:=]\s*)(["']?)[^\s"',}]+(["']?)/gi,
    (_match, prefix: string, quote: string) =>
      `${prefix}${quote}${REDACTED}${quote}`
  );

  // Long opaque tokens (base64/hex runs, no path separators so we keep file paths).
  out = out.replace(/\b[A-Za-z0-9+_-]{40,}={0,2}\b/g, REDACTED);

  return out;
}
