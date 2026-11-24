import { serializeDoc, serializeList } from './serialize';

describe('serializeDoc', () => {
  it('adds an id string and keeps the legacy id when requested', () => {
    const doc = { _id: { toString: () => 'abc123' }, name: 'Turf' };
    expect(serializeDoc(doc, { keepLegacyId: true })).toMatchObject({ _id: 'abc123', id: 'abc123', name: 'Turf' });
    expect(serializeDoc(doc)).toEqual({ id: 'abc123', name: 'Turf' });
  });

  it('supports mongoose documents, extra fields and date conversion', () => {
    const doc = {
      _id: { toString: () => 'def456' },
      toObject() { return { _id: this._id, validFrom: new Date('2026-11-24T00:00:00Z') }; },
    };
    const result = serializeDoc(doc, { keepLegacyId: true, dates: ['validFrom'], extra: { vendorName: 'Owner' } });
    expect(result).toEqual({
      _id: 'def456',
      id: 'def456',
      validFrom: '2026-11-24T00:00:00.000Z',
      vendorName: 'Owner',
    });
  });
});

describe('serializeList', () => {
  it('maps a list of documents', () => {
    const ids = ['a', 'b'];
    const docs = ids.map(id => ({ _id: { toString: () => id } }));
    expect(serializeList(docs).map(d => d.id)).toEqual(ids);
    expect(serializeList(null)).toEqual([]);
  });
});
