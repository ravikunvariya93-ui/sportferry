// Exact venue location helpers. Coordinates only — no external API key needed.

export function hasCoords(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

// Normalise a { lat, lng } pair from request input; invalid → both null.
export function normalizeCoords(lat, lng) {
  const la = lat === '' || lat == null ? null : Number(lat);
  const ln = lng === '' || lng == null ? null : Number(lng);
  if (Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180) {
    return { lat: la, lng: ln };
  }
  return { lat: null, lng: null };
}

// Accepts a Google Maps link or a raw "lat, lng" string and returns { lat, lng }.
export function parseLatLng(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  const patterns = [
    /^(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)$/,           // "23.0225, 72.5714"
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,                       // .../place/...!3d23.02!4d72.57
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,                           // .../@23.02,72.57,15z
    /[?&](?:q|query|ll|center|destination|daddr)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i, // ?q=23.02,72.57
    /(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/,                     // any "lat,lng" pair
  ];

  for (const re of patterns) {
    const m = s.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    }
  }
  return null;
}

export function mapsEmbedUrl(lat, lng, zoom = 16) {
  return `https://maps.google.com/maps?hl=en&q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function mapsDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
