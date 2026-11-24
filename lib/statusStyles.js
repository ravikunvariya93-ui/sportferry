const STYLES = {
  CONFIRMED: { label: 'Confirmed', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  COMPLETED: { label: 'Completed', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  ACTIVE: { label: 'Active', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  APPROVED: { label: 'Approved', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  PENDING: { label: 'Pending', bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  PROCESSING: { label: 'Processing', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  PAYMENT_PENDING: { label: 'Payment Pending', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  CANCELLED: { label: 'Cancelled', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  REJECTED: { label: 'Rejected', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  FAILED: { label: 'Failed', bg: 'rgba(239,68,68,0.12)', color: '#dc2626' },
  SUSPENDED: { label: 'Suspended', bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
  OPEN: { label: 'Open', bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
  RESOLVED: { label: 'Resolved', bg: 'rgba(22,163,74,0.12)', color: '#16a34a' },
  CLOSED: { label: 'Closed', bg: 'rgba(100,116,139,0.12)', color: '#64748b' },
};

export const STATUS_STYLES = STYLES;

export function statusStyle(status, overrides = {}) {
  return { bg: 'rgba(148,163,184,0.1)', color: '#64748b', label: status || '', ...(STYLES[status] || {}), ...overrides };
}
