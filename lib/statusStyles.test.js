import { statusStyle, STATUS_STYLES } from './statusStyles';

describe('statusStyle', () => {
  it('uses shared colours for known statuses', () => {
    expect(statusStyle('CONFIRMED')).toMatchObject({ color: '#16a34a', label: 'Confirmed' });
    expect(statusStyle('PENDING').color).toBe('#d97706');
    expect(statusStyle('CANCELLED').color).toBe('#dc2626');
  });

  it('falls back safely and applies overrides', () => {
    expect(statusStyle('CUSTOM').label).toBe('CUSTOM');
    expect(statusStyle('PENDING', { label: 'In review', color: '#123456' })).toMatchObject({ label: 'In review', color: '#123456' });
    expect(Object.keys(STATUS_STYLES).length).toBeGreaterThan(8);
  });
});
