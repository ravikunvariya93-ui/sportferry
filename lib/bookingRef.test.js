import { bookingRef } from '@/lib/bookingRef';

describe('bookingRef', () => {
  it('builds a short SF reference from the last 5 id chars, uppercased', () => {
    expect(bookingRef('6acc8895fabcd089ee201222')).toBe('SF01222');
    expect(bookingRef('6ACC8895FABCD089EE201ABC')).toBe('SF01ABC');
  });

  it('handles missing ids', () => {
    expect(bookingRef(undefined)).toBe('SF');
  });
});
