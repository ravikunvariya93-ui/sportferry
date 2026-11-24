import { useEffect, useState } from 'react';

export const CITY_KEY = 'sportferry_city';

// Loose city match — tolerates casing and "Ahmedabad" vs "Ahmedabad City" style
// differences between the stored browsing city and a venue's city field.
export function cityMatches(venueCity, selected) {
  const a = (venueCity || '').toLowerCase().trim();
  const b = (selected || '').toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function useSelectedCity() {
  const [city, setCity] = useState(null);
  useEffect(() => {
    const read = () => localStorage.getItem(CITY_KEY);
    setCity(read());
    const onSet = (event) => setCity(event.detail?.city || read());
    const onReset = () => setCity(read());
    window.addEventListener('sportferry:citySet', onSet);
    window.addEventListener('sportferry:resetLocation', onReset);
    return () => {
      window.removeEventListener('sportferry:citySet', onSet);
      window.removeEventListener('sportferry:resetLocation', onReset);
    };
  }, []);
  return city;
}
