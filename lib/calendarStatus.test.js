import { STATUS_STYLES, CALENDAR_LEGEND } from '@/lib/calendarStatus';

describe('calendarStatus', () => {
  it('defines a style + label for every status', () => {
    for (const key of CALENDAR_LEGEND) {
      expect(STATUS_STYLES[key]).toBeTruthy();
      expect(typeof STATUS_STYLES[key].label).toBe('string');
      expect(STATUS_STYLES[key].color).toMatch(/^#/);
    }
  });

  it('labels the key statuses', () => {
    expect(STATUS_STYLES.AVAILABLE.label).toBe('Available');
    expect(STATUS_STYLES.OFFLINE.label).toBe('Offline Booking');
    expect(STATUS_STYLES.BLOCKED.label).toBe('Blocked');
    expect(STATUS_STYLES.TOURNAMENT.label).toBe('Tournament');
  });
});
