export function serializeDoc(doc, { keepLegacyId = false, dates = [], extra = {} } = {}) {
  if (!doc) return doc;
  const source = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const result = { ...source, ...extra };
  if (source._id) {
    if (keepLegacyId) result._id = source._id.toString();
    else delete result._id;
    result.id = source._id.toString();
  }
  for (const key of dates) {
    if (result[key]) result[key] = new Date(result[key]).toISOString();
  }
  return result;
}

export function serializeList(docs, options = {}) {
  return (docs || []).map(doc => serializeDoc(doc, options));
}
