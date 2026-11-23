/**
 * Calendar slot statuses shared by the vendor calendar (and any future admin
 * calendar). Pure data — safe for client and server.
 */
export const STATUS_STYLES = {
  AVAILABLE: { bg: 'rgba(22,163,74,0.12)', color: '#15803d', label: 'Available' },
  SOLO: { bg: 'rgba(251,191,36,0.16)', color: '#b45309', label: 'Solo Booking' },
  TEAM: { bg: 'rgba(59,130,246,0.14)', color: '#1d4ed8', label: 'Team Booking' },
  GROUP: { bg: 'rgba(139,92,246,0.14)', color: '#6d28d9', label: 'Group Booking' },
  OFFLINE: { bg: 'rgba(249,115,22,0.14)', color: '#c2410c', label: 'Offline Booking' },
  BLOCKED: { bg: 'rgba(239,68,68,0.12)', color: '#b91c1c', label: 'Blocked' },
  TOURNAMENT: { bg: 'rgba(100,116,139,0.14)', color: '#475569', label: 'Tournament' },
};

export const CALENDAR_LEGEND = ['AVAILABLE', 'TEAM', 'SOLO', 'GROUP', 'OFFLINE', 'BLOCKED', 'TOURNAMENT'];
