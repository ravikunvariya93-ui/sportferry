import {
  formatToAMPM,
  parseSlot,
  SLOT_LABELS,
  getISTDayRange,
  slotStartInstant,
  isSlotPast,
  isSlotLabelPast,
  istTodayISO,
  istDateISO,
} from '@/lib/ist';

describe('formatToAMPM', () => {
  it('converts 24h times to 12h with AM/PM', () => {
    expect(formatToAMPM('13:00')).toBe('01:00 PM');
    expect(formatToAMPM('00:30')).toBe('12:30 AM');
    expect(formatToAMPM('18:00')).toBe('06:00 PM');
  });

  it('returns empty string for empty input', () => {
    expect(formatToAMPM(null)).toBe('');
    expect(formatToAMPM(undefined)).toBe('');
  });
});

describe('parseSlot', () => {
  it('parses 12h AM/PM slot labels into 24h times', () => {
    expect(parseSlot('06:00 AM – 07:00 AM')).toEqual({ startTime: '06:00', endTime: '07:00' });
  });

  it('handles the 12 PM (noon) edge', () => {
    expect(parseSlot('12:00 PM – 01:00 PM')).toEqual({ startTime: '12:00', endTime: '13:00' });
  });

  it('handles the 12 AM (midnight) wrap edge', () => {
    expect(parseSlot('11:00 PM – 12:00 AM')).toEqual({ startTime: '23:00', endTime: '00:00' });
  });

  it('returns null for garbage', () => {
    expect(parseSlot('not a slot')).toBeNull();
    expect(parseSlot(null)).toBeNull();
  });
});

describe('SLOT_LABELS', () => {
  it('lists the 18 canonical hourly slots', () => {
    expect(SLOT_LABELS).toHaveLength(18);
    expect(SLOT_LABELS[0]).toBe('06:00 AM – 07:00 AM');
    expect(SLOT_LABELS[SLOT_LABELS.length - 1]).toBe('11:00 PM – 12:00 AM');
  });

  it('round-trips through parseSlot', () => {
    for (const label of SLOT_LABELS) {
      const parsed = parseSlot(label);
      expect(parsed).not.toBeNull();
      expect(parsed.startTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});

describe('getISTDayRange', () => {
  it('returns a UTC range covering one full IST day (IST = UTC+5:30)', () => {
    const { startUTC, endUTC } = getISTDayRange('2026-10-08');
    expect(startUTC.toISOString()).toBe('2026-10-07T18:30:00.000Z');
    expect(endUTC.toISOString()).toBe('2026-10-08T18:29:59.999Z');
  });
});

describe('slotStartInstant / isSlotPast (IST-aware)', () => {
  it('resolves an IST slot start to the correct UTC instant', () => {
    expect(slotStartInstant('2026-10-08', '18:00').toISOString()).toBe('2026-10-08T12:30:00.000Z');
  });

  it('is false before the slot and true at/after it', () => {
    expect(isSlotPast('2026-10-08', '18:00', new Date('2026-10-08T12:00:00Z'))).toBe(false);
    expect(isSlotPast('2026-10-08', '18:00', new Date('2026-10-08T12:30:00Z'))).toBe(true);
    expect(isSlotPast('2026-10-08', '18:00', new Date('2026-10-08T13:00:00Z'))).toBe(true);
  });

  it('isSlotLabelPast understands 12h labels', () => {
    expect(isSlotLabelPast('06:00 PM – 07:00 PM', '2026-10-08', new Date('2026-10-08T12:00:00Z'))).toBe(false);
    expect(isSlotLabelPast('06:00 PM – 07:00 PM', '2026-10-08', new Date('2026-10-08T12:30:00Z'))).toBe(true);
  });
});

describe('istTodayISO / istDateISO', () => {
  it('converts a UTC instant to the IST calendar date', () => {
    // 19:00 UTC == 00:30 IST the next day.
    expect(istTodayISO(new Date('2026-10-08T19:00:00Z'))).toBe('2026-10-09');
    // 18:00 UTC == 23:30 IST the same day.
    expect(istTodayISO(new Date('2026-10-08T18:00:00Z'))).toBe('2026-10-08');
  });

  it('adds days across the IST boundary', () => {
    expect(istDateISO(1, new Date('2026-10-08T19:00:00Z'))).toBe('2026-10-10');
  });
});
