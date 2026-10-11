export const CITY_KEY = 'sportferry_city';

// Loose city match — tolerates casing and "Ahmedabad" vs "Ahmedabad City" style
// differences between the stored browsing city and a venue's city field.
export function cityMatches(venueCity, selected) {
  const a = (venueCity || '').toLowerCase().trim();
  const b = (selected || '').toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}
