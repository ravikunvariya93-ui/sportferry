'use client';

import { useEffect } from 'react';

const CITY_KEY = 'sportferry_city';

/**
 * Seeds the browsing city from the user's profile.
 *
 * The profile stores its city in Mongo; the topbar pill, location modal and
 * home-page recommendations all read localStorage. Without this bridge a user
 * with a saved profile city still saw "Select your city" everywhere.
 *
 * Precedence: an explicit choice already in localStorage always wins — this
 * only fills the gap when nothing is stored yet.
 */
export default function CitySync({ defaultCity }) {
  useEffect(() => {
    if (!defaultCity) return;
    try {
      if (localStorage.getItem(CITY_KEY)) return;
      localStorage.setItem(CITY_KEY, defaultCity);
      window.dispatchEvent(
        new CustomEvent('sportferry:citySet', { detail: { city: defaultCity } })
      );
    } catch {
      /* storage blocked — pill keeps its fallback label */
    }
  }, [defaultCity]);

  return null;
}
