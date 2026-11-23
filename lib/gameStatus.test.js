import { groupGames } from '@/lib/gameStatus';

const booking = (overrides = {}) => ({
  _id: '6acc8895fabcd089ee201222',
  venueId: 'v1', venueName: 'SkyTurf', venueCity: 'Ahmedabad',
  dateISO: '2026-11-21', startTime: '18:00', endTime: '19:00', turf: 1,
  playersCount: 3, classification: 'SOLO', status: 'PENDING', userName: 'Amit', teamSide: 1,
  ...overrides,
});

describe('groupGames', () => {
  it('groups bookings on the same turf + slot and counts the fill', () => {
    const { games, counts } = groupGames({
      bookings: [booking(), booking({ _id: '6acc8895fabcd089ee201223', playersCount: 3, userName: 'Jay' })],
      todayISO: '2026-11-21',
    });
    expect(games).toHaveLength(1);
    expect(games[0]).toMatchObject({ players: 6, capacity: 12, spotsLeft: 6, status: 'FILLING', active: true });
    expect(games[0].roster).toHaveLength(2);
    expect(counts.FILLING).toBe(1);
  });

  it('marks a group with any confirmed booking as CONFIRMED', () => {
    const { games } = groupGames({ bookings: [booking({ status: 'CONFIRMED', playersCount: 12, classification: 'GROUP' })], todayISO: '' });
    expect(games[0].status).toBe('CONFIRMED');
  });

  it('separates turfs and slots', () => {
    const { games } = groupGames({
      bookings: [booking(), booking({ turf: 2 }), booking({ startTime: '19:00', endTime: '20:00' })],
      todayISO: '',
    });
    expect(games).toHaveLength(3);
  });

  it('surfaces the opposing-team restriction', () => {
    const { games } = groupGames({
      bookings: [booking({ classification: 'TEAM', playersCount: 4 })], todayISO: '',
    });
    expect(games[0].reason).toMatch(/4-player/i);
  });
});
