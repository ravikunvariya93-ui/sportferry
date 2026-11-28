// booking-utils imports the Booking model (which pulls in Mongoose/bson ESM).
// Mock it so this suite doesn't need a Mongo driver.
jest.mock('@/models/Booking', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('@/lib/refunds', () => ({
  __esModule: true,
  executeRefund: jest.fn(),
}));

import Booking from '@/models/Booking';
import { executeRefund } from '@/lib/refunds';
import { autoConfirmIfReady, releaseExpiredPendingBookings } from '@/lib/booking-utils';

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

  it('does NOT confirm a lone full side (6 players) below the 8-player bar', async () => {
    mockBookings([{ teamSide: 1, playersCount: 6, status: 'PENDING' }]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT confirm a full side plus one player (7 total)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 6, status: 'PENDING' },
      { teamSide: 2, playersCount: 1, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('confirms on 8 players in total, whatever the split (4 + 4)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 4, status: 'PENDING' },
      { teamSide: 2, playersCount: 4, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('confirms on 8 players in total, whatever the split (6 + 2)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 6, status: 'PENDING' },
      { teamSide: 2, playersCount: 2, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });

  it('does NOT confirm below 8 players on the turf (6 + 1)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 6, status: 'PENDING' },
      { teamSide: 2, playersCount: 1, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT confirm a lone 7-player side', async () => {
    mockBookings([{ teamSide: 1, playersCount: 7, status: 'PENDING' }]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(false);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('confirms on 8 players in total even as individuals (5 + 3)', async () => {
    mockBookings([
      { teamSide: 1, playersCount: 5, status: 'PENDING' },
      { teamSide: 2, playersCount: 3, status: 'PENDING' },
    ]);
    const confirmed = await autoConfirmIfReady(...args);
    expect(confirmed).toBe(true);
    expect(Booking.updateMany).toHaveBeenCalledTimes(1);
  });
});

describe('releaseExpiredPendingBookings', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const past = {
    _id: 'b1',
    status: 'PENDING',
    bookingType: 'ONLINE',
    totalAmount: 1200,
    date: new Date('2020-01-01T00:00:00Z'),
    startTime: '18:00',
  };

  function mockPending(rows) {
    Booking.find.mockReturnValue({ lean: async () => rows });
  }

  beforeEach(() => {
    Booking.find.mockReset();
    Booking.findOneAndUpdate.mockReset();
    Booking.updateOne.mockReset();
    executeRefund.mockReset();
    Booking.updateOne.mockResolvedValue({});
    executeRefund.mockResolvedValue({ status: 'COMPLETED', refundId: 'rfnd_1' });
    Booking.findOneAndUpdate.mockReturnValue({ lean: async () => ({ ...past, status: 'CANCELLED' }) });
  });

  it('cancels a past PENDING booking and refunds the player in full', async () => {
    mockPending([past]);

    const released = await releaseExpiredPendingBookings({ user: 'u1' }, now);

    expect(released).toBe(1);
    expect(Booking.find).toHaveBeenCalledWith({ user: 'u1', status: 'PENDING' });
    const [, update] = Booking.findOneAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({
      status: 'CANCELLED',
      cancelledBy: 'ADMIN',
      refundPercent: 100,
      refundAmount: 1200,
    });
    expect(executeRefund).toHaveBeenCalledWith(expect.objectContaining({ _id: 'b1' }), 1200);
    expect(Booking.updateOne).toHaveBeenCalledWith(
      { _id: 'b1' },
      { $set: { refundStatus: 'COMPLETED', refundId: 'rfnd_1' } }
    );
  });

  it('leaves a booking whose slot has not started alone', async () => {
    mockPending([{ ...past, date: new Date('2030-01-01T00:00:00Z') }]);

    const released = await releaseExpiredPendingBookings({}, now);

    expect(released).toBe(0);
    expect(Booking.findOneAndUpdate).not.toHaveBeenCalled();
    expect(executeRefund).not.toHaveBeenCalled();
  });

  it('does not refund an offline walk-in', async () => {
    mockPending([{ ...past, bookingType: 'OFFLINE' }]);
    executeRefund.mockResolvedValue({ status: 'NONE' });

    await releaseExpiredPendingBookings({}, now);

    expect(executeRefund).toHaveBeenCalledWith(expect.objectContaining({ _id: 'b1' }), 0);
  });

  it('skips a booking another request already claimed', async () => {
    mockPending([past]);
    Booking.findOneAndUpdate.mockReturnValue({ lean: async () => null });

    const released = await releaseExpiredPendingBookings({}, now);

    expect(released).toBe(0);
    expect(executeRefund).not.toHaveBeenCalled();
    expect(Booking.updateOne).not.toHaveBeenCalled();
  });
});
