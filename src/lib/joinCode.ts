/**
 * Join-code generation (hardening 1). Import-free so node:test can run it.
 * 8 characters from a 32-letter alphabet with no look-alikes (no 0/O/1/I),
 * drawn from the browser's cryptographic generator. 256 is a multiple of 32,
 * so taking the low 5 bits of each random byte has no modulo bias.
 */
export const NEW_JOIN_CODE_LENGTH = 8;
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  const bytes = new Uint8Array(NEW_JOIN_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < bytes.length; i++) {
    code += JOIN_CODE_ALPHABET[bytes[i] & 31];
  }
  return code;
}
