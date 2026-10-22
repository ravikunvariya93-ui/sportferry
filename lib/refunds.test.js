// lib/refunds.js talks to Razorpay — mock it so the suite needs no network.
jest.mock('@/lib/razorpay', () => ({
  refundPayment: jest.fn(),
}));

import { refundPayment } from '@/lib/razorpay';
import { executeRefund } from '@/lib/refunds';

describe('executeRefund', () => {
  beforeEach(() => {
    refundPayment.mockReset();
  });

  it('does nothing when there is no amount to refund', async () => {
    expect(await executeRefund({ paymentId: 'pay_1' }, 0)).toEqual({ status: 'NONE' });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('does nothing for an offline booking — there is no money to return', async () => {
    expect(await executeRefund({ paymentId: 'pay_1', bookingType: 'OFFLINE' }, 500))
      .toEqual({ status: 'NONE' });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('does nothing when the booking has no payment id', async () => {
    expect(await executeRefund({ bookingType: 'ONLINE' }, 500)).toEqual({ status: 'NONE' });
    expect(refundPayment).not.toHaveBeenCalled();
  });

  it('refunds the payment and reports COMPLETED with the refund id', async () => {
    refundPayment.mockResolvedValue({ ok: true, refundId: 'rfnd_1' });
    const result = await executeRefund({ paymentId: 'pay_1', bookingType: 'ONLINE' }, 1200);
    expect(refundPayment).toHaveBeenCalledWith('pay_1', 1200);
    expect(result).toEqual({ status: 'COMPLETED', refundId: 'rfnd_1' });
  });

  it('reports FAILED when Razorpay refuses — the money is still owed', async () => {
    refundPayment.mockResolvedValue({ ok: false, error: 'gateway down' });
    const result = await executeRefund({ paymentId: 'pay_1', bookingType: 'ONLINE' }, 1200);
    expect(result).toEqual({ status: 'FAILED', error: 'gateway down' });
  });
});
