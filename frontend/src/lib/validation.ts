// These mirror the server's rules so people find out what is wrong before a round trip. The server
// still checks everything, and its answer is shown if it disagrees.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** bcrypt, which hashes the passwords, ignores anything beyond 72 bytes, so the server refuses longer ones. */
const MAX_PASSWORD_BYTES = 72;
const MIN_PASSWORD_CHARACTERS = 8;

/** @returns a message for the person, or undefined if the address is acceptable. */
export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (email === "") return "Enter your email address.";
  return EMAIL.test(email) ? undefined : "Enter a valid email address.";
}

/** @returns a message for the person, or undefined if the password is acceptable. */
export function validatePassword(value: string): string | undefined {
  if (value === "") return "Enter a password.";
  if (Array.from(value).length < MIN_PASSWORD_CHARACTERS) return `Use at least ${MIN_PASSWORD_CHARACTERS} characters.`;
  // Accented letters and emoji take several bytes each, so count bytes, not characters.
  if (new TextEncoder().encode(value).length > MAX_PASSWORD_BYTES) return `That password is too long (${MAX_PASSWORD_BYTES} bytes at most).`;
  return undefined;
}
