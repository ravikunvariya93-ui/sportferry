jest.mock('@/models/BlockedSlot', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));

import BlockedSlot from '@/models/BlockedSlot';
import { turfSetFromBlocks, blockedTurfsInSlot, isTurfBlocked } from '@/lib/blockedSlots';

function mockRows(rows) {
  BlockedSlot.find.mockReturnValue({ select: () => ({ lean: async () => rows }) });
}

describe('blockedSlots', () => {
  beforeEach(() => {
    BlockedSlot.find.mockReset();
  });

  it('builds a numeric set from block rows', () => {
    expect([...turfSetFromBlocks([{ turf: 1 }, { turf: '2' }])]).toEqual([1, 2]);
    expect(turfSetFromBlocks(undefined).size).toBe(0);
  });

  it('queries by venue, date (IST midnight) and slot', async () => {
    mockRows([{ turf: 2 }]);
    const blocked = await blockedTurfsInSlot('v1', '2026-11-21', '18:00', '19:00');
    expect(blocked.has(2)).toBe(true);

    const query = BlockedSlot.find.mock.calls[0][0];
    expect(query.venue).toBe('v1');
    expect(query.startTime).toBe('18:00');
    expect(query.endTime).toBe('19:00');
    expect(query.date).toEqual(new Date(Date.UTC(2026, 10, 21)));
  });

  it('reports whether a specific turf is blocked', async () => {
    mockRows([{ turf: 1 }]);
    expect(await isTurfBlocked('v1', '2026-11-21', '18:00', '19:00', 1)).toBe(true);
    expect(await isTurfBlocked('v1', '2026-11-21', '18:00', '19:00', 2)).toBe(false);
  });
});
