/** Human-friendly booking reference derived deterministically from the id. */
export function bookingRef(id) {
  const tail = String(id || '').slice(-5).toUpperCase();
  return `SF${tail}`;
}
