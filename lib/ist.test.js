import {
  formatToAMPM,
  parseSlot,
  parseBookableSlot,
  SLOT_LABELS,
  getISTDayRange,
  slotStartInstant,
  isSlotPast,
  isSlotLabelPast,
  istTodayISO,
  istDateISO,
  isValidDateISO,
  addDaysISO,
  visibleISODates,
  formatSlotLabel,
  formatBookingDate,
  dateToISTDateISO,
  formatDateDDMMYYYY,
  bookableStartTimes,
  firstUpcomingSlotLabel,
} from '@/lib/ist';

describe('formatToAMPM', () => {
  it('converts 24h times to 12h with AM/PM', () => {
    expect(formatToAMPM('13:00')).toBe('01:00 PM');
    expect(formatToAMPM('00:30')).toBe('12:30 AM');
    expect(formatToAMPM('18:00')).toBe('06:00 PM');
    expect(formatToAMPM('09:05', { padHour: false })).toBe('9:05 AM');
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

describe('parseBookableSlot', () => {
  it('accepts every canonical slot', () => {
    for (const label of SLOT_LABELS) {
      expect(parseBookableSlot(label)).not.toBeNull();
    }
  });

  it('accepts a 24h slot inside the venue grid', () => {
    expect(parseBookableSlot('18:00 - 19:00')).toEqual({ startTime: '18:00', endTime: '19:00' });
  });

  it('accepts the midnight wrap slot', () => {
    expect(parseBookableSlot('11:00 PM – 12:00 AM')).toEqual({ startTime: '23:00', endTime: '00:00' });
  });

  it('rejects a slot that is not one hour long', () => {
    expect(parseBookableSlot('06:00 AM – 11:00 PM')).toBeNull();
    expect(parseBookableSlot('18:00 - 18:30')).toBeNull();
  });

  it('rejects slots outside the venue hours (06:00–23:00)', () => {
    expect(parseBookableSlot('02:00 AM - 03:00 AM')).toBeNull();
    expect(parseBookableSlot('00:00 - 01:00')).toBeNull();
  });

  it('rejects garbage', () => {
    expect(parseBookableSlot('not a slot')).toBeNull();
    expect(parseBookableSlot(null)).toBeNull();
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

describe('isValidDateISO', () => {
  it('accepts real calendar dates only', () => {
    expect(isValidDateISO('2026-11-24')).toBe(true);
    expect(isValidDateISO('2024-02-29')).toBe(true);
    expect(isValidDateISO('2026-02-29')).toBe(false);
    expect(isValidDateISO('2026-13-01')).toBe(false);
    expect(isValidDateISO('24-11-2026')).toBe(false);
    expect(isValidDateISO('2026-11-24T00:00:00Z')).toBe(false);
    expect(isValidDateISO(null)).toBe(false);
  });
});

describe('shared date helpers', () => {
  it('shifts ISO dates and builds visible ranges', () => {
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01');
    expect(visibleISODates('2026-11-25', 'Day')).toEqual(['2026-11-25']);
    expect(visibleISODates('2026-11-25', 'Week')).toHaveLength(7);
    expect(visibleISODates('2026-11-25', 'Month')).toHaveLength(30);
  });

  it('formats slot labels and booking dates consistently', () => {
    expect(formatSlotLabel('18:00', '19:00')).toBe('06:00 PM – 07:00 PM');
    expect(formatSlotLabel('18:00', '19:00', { ampm: false })).toBe('18:00 – 19:00');
    expect(formatDateDDMMYYYY('2026-11-24')).toBe('24-11-2026');
    expect(dateToISTDateISO('2026-11-24T18:30:00Z')).toBe('2026-11-25');
    expect(formatBookingDate('2026-11-24T00:00:00Z', { timeZone: 'UTC' })).toContain('Nov 2026');
    expect(formatBookingDate('2026-11-24T00:00:00Z', { timeZone: 'UTC', year: false })).toBe('24 Nov');
  });

  it('derives bookable starts and upcoming slots from the grid', () => {
    expect(bookableStartTimes()).toHaveLength(18);
    expect(bookableStartTimes()[0]).toBe('06:00');
    expect(firstUpcomingSlotLabel('2026-11-24', new Date('2026-11-24T10:00:00Z'))).not.toBeNull();
  });
});
