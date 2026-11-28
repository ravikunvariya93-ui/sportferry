/** Display helpers shared by client components and API messages. */

export function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

export function formatINR(value) {
  return `₹${formatNumber(value)}`;
}

export function formatDayMonth(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatMonthYear(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
