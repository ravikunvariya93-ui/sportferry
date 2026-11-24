export function parseListParams(request, { page = 1, limit = 20, maxLimit = 100, filters = [] } = {}) {
  const { searchParams } = new URL(request.url);
  const rawPage = Number(searchParams.get('page'));
  const rawLimit = Number(searchParams.get('limit'));
  const safePage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : page;
  const safeLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : limit;
  const query = {};
  for (const key of filters) {
    const value = searchParams.get(key);
    if (value) query[key] = value;
  }
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit, query, searchParams };
}

export function parseDateFilter(request, key = 'date') {
  return new URL(request.url).searchParams.get(key);
}

export function parseCsvFormat(request) {
  return new URL(request.url).searchParams.get('format') === 'csv';
}
