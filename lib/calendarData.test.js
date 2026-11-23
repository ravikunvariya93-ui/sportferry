import { classifyTurf, buildDayGrid } from '@/lib/calendarData';
import { SLOT_LABELS } from '@/lib/ist';

describe('classifyTurf', () => {
  it('is AVAILABLE with no bookings', () => {
    expect(classifyTurf([])).toBe('AVAILABLE');
  });

  it('prefers OFFLINE then GROUP then TEAM then SOLO', () => {
    expect(classifyTurf([{ classification: 'SOLO' }])).toBe('SOLO');
    expect(classifyTurf([{ classification: 'TEAM' }])).toBe('TEAM');
    expect(classifyTurf([{ classification: 'GROUP' }])).toBe('GROUP');
    expect(classifyTurf([{ classification: 'SOLO' }, { bookingType: 'OFFLINE' }])).toBe('OFFLINE');
    expect(classifyTurf([{ classification: 'SOLO' }, { classification: 'TEAM' }])).toBe('TEAM');
  });
});

describe('buildDayGrid', () => {
  const venue = { _id: { toString: () => 'v1' }, name: 'SkyTurf', numberOfTurfs: 2 };

  it('builds one row per slot with a cell per turf', () => {
    const result = buildDayGrid({
      venue,
      date: '2026-11-21',
      bookings: [{ turf: 1, startTime: '18:00', endTime: '19:00', playersCount: 6, classification: 'SOLO', bookingType: 'ONLINE' }],
      blocks: [{ turf: 2, startTime: '18:00', endTime: '19:00', reason: 'MAINTENANCE' }],
      turfs: [{ _id: { toString: () => 't1' }, venue: { toString: () => 'v1' }, name: 'Turf 1', order: 1 }],
    });

    expect(result.grid).toHaveLength(SLOT_LABELS.length);
    const sixPm = result.grid.find(r => r.slot === '06:00 PM – 07:00 PM');
    expect(sixPm.cells).toHaveLength(2);
    expect(sixPm.cells[0]).toMatchObject({ turf: 1, status: 'SOLO', players: 6, capacity: 12 });
    expect(sixPm.cells[1]).toMatchObject({ turf: 2, status: 'BLOCKED', players: 0 });
  });

  it('maps a tournament block to TOURNAMENT', () => {
    const result = buildDayGrid({
      venue, date: '2026-11-21', bookings: [], turfs: [],
      blocks: [{ turf: 1, startTime: '18:00', endTime: '19:00', reason: 'TOURNAMENT' }],
    });
    const row = result.grid.find(r => r.slot === '06:00 PM – 07:00 PM');
    expect(row.cells[0].status).toBe('TOURNAMENT');
  });
});
