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
    Booking.find.mockReturnValue({ session: () => ({ lean: async () => rows }) });
  }

  beforeEach(() => {
    Booking.find.mockReset();
    Booking.updateMany.mockReset();
    Booking.updateMany.mockResolvedValue({});
  });

  it('does NOT confirm a lopsided slot even when the total reaches 6', async () => {
    mockBookings([{ teamSide: 1, playersCount: 6, status: 'PENDING' }]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT confirm when only one team has 3+ players', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 4, status: 'PENDING' },
      { teamSide: 2, playersCount: 2, status: 'PENDING' },
    ]);
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
