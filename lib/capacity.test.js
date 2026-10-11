import { PLAYERS_PER_SIDE, turfCountOf, slotCapacityFor, allocateBooking } from '@/lib/capacity';

describe('capacity math', () => {
  it('is 6 per side / 12 per turf, scaled by turf count', () => {
    expect(PLAYERS_PER_SIDE).toBe(6);
    expect(slotCapacityFor(1)).toBe(12);
    expect(slotCapacityFor(3)).toBe(36);
  });

  it('coerces turf count safely', () => {
    expect(turfCountOf(0)).toBe(1);
    expect(turfCountOf(undefined)).toBe(1);
    expect(turfCountOf('bad')).toBe(1);
  });
});

describe('allocateBooking (one match per turf)', () => {
  const base = { existingBookings: [], playersCount: 3, classification: 'TEAM', turfCount: 1 };

  it('places a team on turf 1, side 1 when empty', () => {
    expect(allocateBooking(base)).toEqual({ turf: 1, assignedSide: 1 });
  });

  it('fills side 2 of the same turf before opening the next turf', () => {
    const existingBookings = [{ turf: 1, teamSide: 1, playersCount: 6, classification: 'TEAM' }];
    expect(allocateBooking({ ...base, existingBookings })).toEqual({ turf: 1, assignedSide: 2 });
  });

  it('opens turf 2 once turf 1 is full on both sides', () => {
    const existingBookings = [
      { turf: 1, teamSide: 1, playersCount: 6, classification: 'TEAM' },
      { turf: 1, teamSide: 2, playersCount: 6, classification: 'TEAM' },
    ];
    expect(allocateBooking({ ...base, existingBookings, turfCount: 2 })).toEqual({ turf: 2, assignedSide: 1 });
  });

  it('reports capacity-full when every turf is full', () => {
    const existingBookings = [
      { turf: 1, teamSide: 1, playersCount: 6, classification: 'TEAM' },
      { turf: 1, teamSide: 2, playersCount: 6, classification: 'TEAM' },
    ];
    expect(allocateBooking({ ...base, existingBookings, turfCount: 1 })).toEqual({ error: 'capacity-full' });
  });

  it('a group match takes a whole empty turf', () => {
    const existingBookings = [{ turf: 1, teamSide: 1, playersCount: 2, classification: 'SOLO' }];
    expect(allocateBooking({ ...base, classification: 'GROUP', playersCount: 12, existingBookings, turfCount: 2 }))
      .toEqual({ turf: 2, assignedSide: 1 });
    expect(allocateBooking({ ...base, classification: 'GROUP', playersCount: 12, existingBookings, turfCount: 1 }))
      .toEqual({ error: 'group-needs-empty' });
  });

  it('keeps a solo on the side that already has a solo (same turf)', () => {
    const existingBookings = [{ turf: 1, teamSide: 2, playersCount: 1, classification: 'SOLO' }];
    expect(allocateBooking({ ...base, classification: 'SOLO', playersCount: 1, existingBookings }))
      .toEqual({ turf: 1, assignedSide: 2 });
  });

  it('treats a booking without a turf as turf 1', () => {
    const existingBookings = [
      { teamSide: 1, playersCount: 6, classification: 'TEAM' }, // legacy: no turf
      { teamSide: 2, playersCount: 6, classification: 'TEAM' },
    ];
    expect(allocateBooking({ ...base, existingBookings, turfCount: 2 })).toEqual({ turf: 2, assignedSide: 1 });
  });
});
