// booking-utils imports the Booking model (which pulls in Mongoose/bson ESM).
// Mock it so this suite doesn't need a Mongo driver.
jest.mock('@/models/Booking', () => ({
  __esModule: true,
  default: { find: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
}));

import Booking from '@/models/Booking';
import { autoConfirmIfReady } from '@/lib/booking-utils';

describe('autoConfirmIfReady', () => {
  const args = ['venue1', new Date('2099-01-10T00:00:00Z'), '18:00', '19:00', 1, {}];

  function mockBookings(rows) {
    // Supports both call shapes: with a session (query.session(s).lean())
    // and without one (query.lean()).
    Booking.find.mockReturnValue({
      lean: async () => rows,
      session: () => ({ lean: async () => rows }),
    });
  }

  beforeEach(() => {
    Booking.find.mockReset();
    Booking.updateMany.mockReset();
    Booking.updateMany.mockResolvedValue({});
  });

  it('confirms a full side even when the other side is empty', async () => {
    mockBookings([{ teamSide: 1, playersCount: 6, status: 'PENDING' }]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('confirms when one side is full even with players on the other side', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 6, status: 'PENDING' },
      { teamSide: 2, playersCount: 1, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('confirms on 6 players in total, whatever the split (4 + 2)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 4, status: 'PENDING' },
      { teamSide: 2, playersCount: 2, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('confirms on 6 players in total, whatever the split (5 + 1)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 5, status: 'PENDING' },
      { teamSide: 2, playersCount: 1, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does NOT confirm below 6 players on the turf', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 4, status: 'PENDING' },
      { teamSide: 2, playersCount: 1, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT confirm a half-full side', async () => {
    mockBookings([{ teamSide: 1, playersCount: 5, status: 'PENDING' }]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('confirms once BOTH teams have at least 3 players', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 3, status: 'PENDING' },
      { teamSide: 2, playersCount: 3, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });
});
