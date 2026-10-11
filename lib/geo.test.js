import { parseLatLng, normalizeCoords, hasCoords, mapsEmbedUrl, mapsDirectionsUrl } from './geo';

describe('parseLatLng', () => {
  test('plain "lat, lng"', () => {
    expect(parseLatLng('23.0225, 72.5714')).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  test('google maps /@lat,lng,zoom link', () => {
    expect(parseLatLng('https://www.google.com/maps/@23.0225,72.5714,15z')).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  test('google maps place link with !3d!4d', () => {
    expect(parseLatLng('https://www.google.com/maps/place/Foo/data=!4m2!3m1!1s0x0:0x0!8m2!3d23.0225!4d72.5714')).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  test('?q= link', () => {
    expect(parseLatLng('https://maps.google.com/?q=23.0225,72.5714')).toEqual({ lat: 23.0225, lng: 72.5714 });
  });
  test('rejects junk, blanks and out-of-range', () => {
    expect(parseLatLng('Ahmedabad')).toBeNull();
    expect(parseLatLng('')).toBeNull();
    expect(parseLatLng(null)).toBeNull();
    expect(parseLatLng('99.0123, 72.5123')).toBeNull();
  });
});

describe('normalizeCoords', () => {
  test('keeps valid numbers', () => {
    expect(normalizeCoords('23.02', '72.57')).toEqual({ lat: 23.02, lng: 72.57 });
  });
  test('nulls missing/invalid/out-of-range', () => {
    expect(normalizeCoords('', '')).toEqual({ lat: null, lng: null });
    expect(normalizeCoords('x', 'y')).toEqual({ lat: null, lng: null });
    expect(normalizeCoords(91, 20)).toEqual({ lat: null, lng: null });
  });
});

describe('hasCoords + map urls', () => {
  test('hasCoords', () => {
    expect(hasCoords({ lat: 1, lng: 2 })).toBe(true);
    expect(hasCoords({})).toBe(false);
    expect(hasCoords(null)).toBe(false);
  });
  test('embed + directions urls carry the coords', () => {
    expect(mapsEmbedUrl(23.02, 72.57)).toContain('q=23.02,72.57');
    expect(mapsDirectionsUrl(23.02, 72.57)).toContain('destination=23.02,72.57');
  });
});
