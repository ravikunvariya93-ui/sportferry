/**
 * Client-side API access.
 *
 * Every route in this app answers with JSON, but an empty body (204), a proxy
 * error page or a dropped connection makes a bare `res.json()` throw a
 * SyntaxError — which hides the real failure behind "Unexpected token '<'".
 *
 * `apiFetch` parses the body exactly once, tolerates a body that is not JSON,
 * and hands back the payload together with the status, so every screen can
 * read the server's message without repeating the parse.
 */

export async function apiFetch(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    data,
    json: async () => data,
  };
}

/** The server's error message, or a caller-supplied fallback. */
export function apiErrorMessage(data, fallback = 'Something went wrong. Please try again.') {
  return data?.message || fallback;
}
