import { computeVendorPayables, commissionOf } from '@/lib/payouts';

describe('commissionOf', () => {
  it('applies a percentage and rounds', () => {
    expect(commissionOf(1000, 12)).toBe(120);
    expect(commissionOf(2496000, 12)).toBe(299520);
    expect(commissionOf(0, 12)).toBe(0);
  });
});

describe('computeVendorPayables', () => {
  const bookings = [
    { vendorId: 'v1', totalAmount: 1000 },
    { vendorId: 'v1', totalAmount: 2000 },
    { vendorId: 'v2', totalAmount: 500 },
    { vendorId: null, totalAmount: 999 }, // ignored (no vendor)
  ];

  it('groups by vendor and applies the 12% commission', () => {
    const rows = computeVendorPayables({ bookings, commissionPercent: 12 });
    const v1 = rows.find(r => r.vendorId === 'v1');
    expect(v1).toMatchObject({ bookings: 2, gross: 3000, commission: 360, net: 2640, payable: 2640 });
    const v2 = rows.find(r => r.vendorId === 'v2');
    expect(v2).toMatchObject({ bookings: 1, gross: 500, net: 440, payable: 440 });
    expect(rows).toHaveLength(2);
  });

  it('subtracts already-settled amounts from the payable', () => {
    const rows = computeVendorPayables({ bookings, settledByVendor: { v1: 1000 }, commissionPercent: 12 });
    expect(rows.find(r => r.vendorId === 'v1').payable).toBe(1640);
  });

  it('never returns a negative payable', () => {
    const rows = computeVendorPayables({ bookings, settledByVendor: { v2: 99999 }, commissionPercent: 12 });
    expect(rows.find(r => r.vendorId === 'v2').payable).toBe(0);
  });
});
