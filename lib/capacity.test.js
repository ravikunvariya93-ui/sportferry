import {
  PLAYERS_PER_SIDE,
  turfCountOf,
  slotCapacityFor,
  allocateBooking,
  existingFromSlotStats,
  openSeatsFor,
} from '@/lib/capacity';

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
    expect(allocateBooking({ ...base, existingBookings, playersCount: 6 })).toEqual({ turf: 1, assignedSide: 2 });
  });

  it('does not let a smaller team face a bigger team — sizes must match', () => {
    const existingBookings = [{ turf: 1, teamSide: 1, playersCount: 6, classification: 'TEAM' }];
    expect(allocateBooking({ ...base, existingBookings })).toEqual({ error: 'capacity-full' });
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

describe('allocateBooking (team matches)', () => {
  const team = (turf, teamSide, playersCount) => ({ turf, teamSide, playersCount, classification: 'TEAM' });

  it('sends the opposing team onto the opposite side of the same turf', () => {
    const existingBookings = [team(1, 1, 3)];
    expect(allocateBooking({ existingBookings, playersCount: 3, classification: 'TEAM', turfCount: 1 }))
      .toEqual({ turf: 1, assignedSide: 2 });
  });

  it('matches a 4-player team against a 4-player team', () => {
    const existingBookings = [team(1, 1, 4)];
    expect(allocateBooking({ existingBookings, playersCount: 4, classification: 'TEAM', turfCount: 1 }))
      .toEqual({ turf: 1, assignedSide: 2 });
  });

  it('matches a 6-player team against a 6-player team', () => {
    const existingBookings = [team(1, 1, 6)];
    expect(allocateBooking({ existingBookings, playersCount: 6, classification: 'TEAM', turfCount: 1 }))
      .toEqual({ turf: 1, assignedSide: 2 });
  });

  it('opens another turf when the opponent size does not match', () => {
    const existingBookings = [team(1, 1, 3)];
    expect(allocateBooking({ existingBookings, playersCount: 4, classification: 'TEAM', turfCount: 2 }))
      .toEqual({ turf: 2, assignedSide: 1 });
  });

  it('opens another turf for a third team', () => {
    const existingBookings = [team(1, 1, 3), team(1, 2, 3)];
    expect(allocateBooking({ existingBookings, playersCount: 3, classification: 'TEAM', turfCount: 2 }))
      .toEqual({ turf: 2, assignedSide: 1 });
  });

  it('does not let a team of another size face a booked team on a single-turf venue', () => {
    const existingBookings = [team(1, 1, 3)];
    expect(allocateBooking({ existingBookings, playersCount: 4, classification: 'TEAM', turfCount: 1 }))
      .toEqual({ error: 'capacity-full' });
  });

  it('keeps a team off a side that already holds individuals', () => {
    const existingBookings = [{ turf: 1, teamSide: 1, playersCount: 2, classification: 'SOLO' }];
    expect(allocateBooking({ existingBookings, playersCount: 3, classification: 'TEAM', turfCount: 1 }))
      .toEqual({ turf: 1, assignedSide: 2 });
  });

  it('closes the team side to individuals and reserves the opposite side', () => {
    const existingBookings = [team(1, 1, 3)];
    // Side 1 belongs to the team, side 2 is reserved for the opposing 3-player
    // team — an individual has to go to another turf.
    expect(allocateBooking({
      existingBookings, playersCount: 1, classification: 'SOLO', turfCount: 2,
    })).toEqual({ turf: 2, assignedSide: 1 });
  });

  it('lets individuals keep joining the side that already holds them', () => {
    const existingBookings = [{ turf: 1, teamSide: 1, playersCount: 2, classification: 'SOLO' }];
    expect(allocateBooking({
      existingBookings, playersCount: 1, classification: 'SOLO', turfCount: 1,
    })).toEqual({ turf: 1, assignedSide: 1 });
  });

  it('honours a preferred side when it is legal', () => {
    expect(allocateBooking({
      existingBookings: [], playersCount: 1, classification: 'SOLO', turfCount: 1, preferredSide: 2,
    })).toEqual({ turf: 1, assignedSide: 2 });
  });

  it('ignores a preferred side that a team already owns', () => {
    const existingBookings = [team(1, 1, 3)];
    expect(allocateBooking({
      existingBookings, playersCount: 3, classification: 'TEAM', turfCount: 1, preferredSide: 1,
    })).toEqual({ turf: 1, assignedSide: 2 });
  });
});

describe('openSeatsFor', () => {
  const b = (turf, teamSide, playersCount, classification = 'SOLO') =>
    ({ turf, teamSide, playersCount, classification });

  it('counts every seat when the slot is empty', () => {
    expect(openSeatsFor({ bookings: [], turfCount: 1 })).toBe(12);
    expect(openSeatsFor({ bookings: [], turfCount: 3 })).toBe(36);
  });

  it('does not count the seats a team owns', () => {
    // A team of 6 owns side 1; the opposite side is reserved for the
    // opposing team — an individual can take neither.
    expect(openSeatsFor({ bookings: [b(1, 1, 6, 'TEAM')], turfCount: 1 })).toBe(0);
  });

  it('counts the free seats of the side next to individuals', () => {
    expect(openSeatsFor({ bookings: [b(1, 1, 2)], turfCount: 1 })).toBe(10);
  });

  it('counts other turfs even when one is taken by a team', () => {
    expect(openSeatsFor({ bookings: [b(1, 1, 6, 'TEAM')], turfCount: 2 })).toBe(12);
  });
});

describe('existingFromSlotStats', () => {
  it('rebuilds the per-booking list from availability stats', () => {
    const slotStat = {
      turfs: [
        {
          turf: 1,
          team1Slots: [{ count: 3, type: 'TEAM' }],
          team2Slots: [{ count: 1, type: 'SOLO' }],
        },
      ],
    };
    expect(existingFromSlotStats(slotStat)).toEqual([
      { playersCount: 3, classification: 'TEAM', teamSide: 1, turf: 1 },
      { playersCount: 1, classification: 'SOLO', teamSide: 2, turf: 1 },
    ]);
  });

  it('returns nothing for an empty slot', () => {
    expect(existingFromSlotStats(undefined)).toEqual([]);
    expect(existingFromSlotStats({ turfs: [] })).toEqual([]);
  });
});
