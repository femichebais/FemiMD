import { randomBytes } from "crypto";

// Crockford-style base32 minus look-alikes — clearer when read aloud.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// 8-char code → ~ALPHABET.length^8 = 8.5e11 possibilities. Plenty of headroom
// for the POC scale (~hundreds of classrooms).
export function generateInviteCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}
