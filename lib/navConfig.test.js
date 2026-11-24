import { isActivePath } from './navConfig';

describe('isActivePath', () => {
  it('matches exact and nested paths', () => {
    expect(isActivePath('/admin', '/admin', { exact: true })).toBe(true);
    expect(isActivePath('/admin/bookings', '/admin', { exact: true })).toBe(false);
    expect(isActivePath('/vendor/calendar', '/vendor')).toBe(true);
    expect(isActivePath('/vendor', '/')).toBe(false);
  });

  it('ignores query strings and never-active items', () => {
    expect(isActivePath('/vendor/calendar', '/vendor/calendar?offline=1')).toBe(true);
    expect(isActivePath('/vendor/calendar', '/vendor/calendar', { neverActive: true })).toBe(false);
  });
});
