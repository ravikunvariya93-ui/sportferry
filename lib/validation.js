/** Shared input-validation helpers. */

/** Escape a user string so it can be used safely inside a RegExp. */
export function escapeRegex(str) {
  return String(str ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;
export const PASSWORD_MIN = 8;
export const NAME_MAX = 80;

export const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;

export function isValidUsername(value) {
  return typeof value === 'string' && USERNAME_RE.test(value);
}

export function isValidPassword(value) {
  return typeof value === 'string' && value.length >= PASSWORD_MIN;
}
