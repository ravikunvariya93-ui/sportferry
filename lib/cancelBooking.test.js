jest.mock('@/lib/refunds', () => ({
  __esModule: true,
  executeRefund: jest.fn(),
}));

import { applyCancellation } from '@/lib/cancelBooking';
import { executeRefund } from '@/lib/refunds';

describe('applyCancellation', () => {
  beforeEach(() => {
    executeRefund.mockReset();
    executeRefund.mockResolvedValue({ status: 'COMPLETED', refundId: 'rfnd_1' });
  });

  it('cancels an online booking and executes the 100% admin refund', async () => {
    const booking = { status: 'CONFIRMED', bookingType: 'ONLINE', totalAmount: 1000, paymentId: 'pay_1' };

    await applyCancellation(booking, { cancelledBy: 'ADMIN', reason: 'Game cancelled' });

    expect(booking).toMatchObject({
      status: 'CANCELLED',
      cancelledBy: 'ADMIN',
      cancellationReason: 'Game cancelled',
      refundPercent: 100,
      refundAmount: 1000,
      refundStatus: 'COMPLETED',
      refundId: 'rfnd_1',
    });
    expect(executeRefund).toHaveBeenCalledWith(expect.objectContaining({ status: 'CANCELLED' }), 1000);
  });

  it('does not move money for an offline walk-in', async () => {
    executeRefund.mockResolvedValue({ status: 'NONE' });
    const booking = { status: 'CONFIRMED', bookingType: 'OFFLINE', totalAmount: 500 };

    await applyCancellation(booking, { cancelledBy: 'ADMIN' });

    expect(booking.refundPercent).toBe(0);
    expect(booking.refundAmount).toBe(0);
    expect(booking.refundStatus).toBe('NONE');
    expect(executeRefund).toHaveBeenCalledWith(expect.anything(), 0);
  });

  it('is a no-op on an already cancelled booking', async () => {
    const booking = { status: 'CANCELLED', bookingType: 'ONLINE', totalAmount: 1000, paymentId: 'pay_1' };
    await applyCancellation(booking, { cancelledBy: 'ADMIN' });
    expect(executeRefund).not.toHaveBeenCalled();
  });
});
