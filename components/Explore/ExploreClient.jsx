'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, LocateFixed, Loader2 } from 'lucide-react';
import VenueCard from '@/components/VenueCard/VenueCard';

const SPORTS = ['Box Cricket'];

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most Popular' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating',     label: 'Top Rated' },
];

const SLOTS = [
  '06:00 AM – 07:00 AM','07:00 AM – 08:00 AM','08:00 AM – 09:00 AM',
  '09:00 AM – 10:00 AM','10:00 AM – 11:00 AM','11:00 AM – 12:00 PM',
  '12:00 PM – 01:00 PM','01:00 PM – 02:00 PM','02:00 PM – 03:00 PM',
  '03:00 PM – 04:00 PM','04:00 PM – 05:00 PM','05:00 PM – 06:00 PM',
  '06:00 PM – 07:00 PM','07:00 PM – 08:00 PM','08:00 PM – 09:00 PM',
  '09:00 PM – 10:00 PM','10:00 PM – 11:00 PM','11:00 PM – 12:00 AM',
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function slotHasPassed(slot, dateISO) {
  if (dateISO !== todayISO()) return false;
  const [startTimeStr] = slot.split(' – ');
  const [time, meridiem] = startTimeStr.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (meridiem === 'PM' && h !== 12) h += 12;
  if (meridiem === 'AM' && h === 12) h = 0;
  const t = new Date(); t.setHours(h, m, 0, 0);
  return t < new Date();
}

function getFirstUpcomingSlot(dateISO) {
  const upcoming = SLOTS.filter(s => !slotHasPassed(s, dateISO));
  return upcoming[0] || 'All Slots';
}

export default function ExploreClient({ initialVenues }) {
  const searchParams = useSearchParams();

  const [selectedCity, setSelectedCity]   = useState('All Cities');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [sortBy, setSortBy]               = useState('popular');
  const [selectedDate, setSelectedDate]   = useState(() => todayISO());
  const [selectedSlot, setSelectedSlot]   = useState(() => getFirstUpcomingSlot(todayISO()));
  const [bookingCounts, setBookingCounts] = useState({});
  const [popLoading, setPopLoading]       = useState(false);
  const [detectedCity, setDetectedCity]   = useState(null);
  const [geoState, setGeoState]           = useState('idle'); // idle | loading | success | denied

  // Available cities from venues
  const availableCities = [...new Set(initialVenues.map(v => v.city).filter(Boolean))].sort();

  // Sync URL params on mount
  useEffect(() => {
    const cityParam  = searchParams.get('city');
    const sportParam = searchParams.get('sport');
    const dateParam  = searchParams.get('date');
    const slotParam  = searchParams.get('slot');
    if (cityParam)  setSelectedCity(cityParam);
    if (sportParam) setSelectedSport(sportParam);
    if (dateParam)  setSelectedDate(dateParam);
    if (slotParam)  setSelectedSlot(slotParam);
  }, [searchParams]);

  // Fetch upcoming-slot popularity for selected date + time
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setPopLoading(true);
        const r = await fetch(
          `/api/venues/popularity?date=${selectedDate}&slot=${encodeURIComponent(selectedSlot)}`,
          { signal: ctrl.signal }
        );
        if (r.ok) {
          const d = await r.json();
          setBookingCounts(d.counts || {});
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error(e);
      } finally {
        setPopLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [selectedDate, selectedSlot]);

  // If selected slot has passed (e.g. date switched to today, or time ticked over), auto-select next upcoming
  useEffect(() => {
    if (selectedSlot !== 'All Slots' && slotHasPassed(selectedSlot, selectedDate)) {
      setSelectedSlot(getFirstUpcomingSlot(selectedDate));
    }
  }, [selectedDate, selectedSlot]);

  const locationControllerRef = React.useRef(null);

  useEffect(() => {
    return () => {
      if (locationControllerRef.current) locationControllerRef.current.abort();
    };
  }, []);

  // Geolocation + reverse geocode
  const detectLocation = useCallback(() => {
    if (!navigator?.geolocation) {
      setGeoState('denied');
      return;
    }

    if (locationControllerRef.current) locationControllerRef.current.abort();
    locationControllerRef.current = new AbortController();
    const signal = locationControllerRef.current.signal;

    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}`,
            { 
              headers: { 'Accept-Language': 'en' },
              signal 
            }
          );
          const data = await res.json();
          // Try progressively: city > town > county > state_district
          const rawCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.county ||
            data.address?.state_district ||
            null;

          if (!rawCity) { setGeoState('denied'); return; }

          // Try to match against an actual city in our venue DB
          const matched = availableCities.find(c =>
            c.toLowerCase() === rawCity.toLowerCase() ||
            rawCity.toLowerCase().includes(c.toLowerCase()) ||
            c.toLowerCase().includes(rawCity.toLowerCase())
          );

          const cityToSet = matched || rawCity;
          setDetectedCity(cityToSet);
          setSelectedCity(matched || 'All Cities');
          setGeoState('success');
        } catch (err) {
          if (err.name === 'AbortError') return;
          setGeoState('denied');
        }
      },
      () => setGeoState('denied'),
      { timeout: 8000 }
    );
  }, [availableCities]);

  // Filtering + sorting (most-booked first by default, only available shown for slot)
  const processedVenues = initialVenues
    .map(venue => ({
      ...venue,
      _bookedTotal: bookingCounts[venue.id]?.total || 0,
      _bookingCount: bookingCounts[venue.id]?.bookings || 0,
    }))
    .filter(venue => {
      const matchesCity  = selectedCity === 'All Cities' || venue.city === selectedCity;
      const matchesSport = selectedSport === 'All Sports' || venue.sportTypes?.includes(selectedSport);
      // When a specific upcoming slot is picked, hide venues where that slot already passed today
      const matchesUpcoming = selectedSlot === 'All Slots' || !slotHasPassed(selectedSlot, selectedDate);
      // Only available venues for this slot (full = 12/12 players)
      const matchesAvailable = selectedSlot === 'All Slots' || venue._bookedTotal < 12;
      return matchesCity && matchesSport && matchesUpcoming && matchesAvailable;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return a.pricePerHour - b.pricePerHour;
      if (sortBy === 'price_desc') return b.pricePerHour - a.pricePerHour;
      if (sortBy === 'rating')     return (b.rating || 0) - (a.rating || 0);
      // 'popular' (default): highly-booked venues first, 0 bookings last
      return (b._bookedTotal || 0) - (a._bookedTotal || 0);
    });

  const clearAll = () => {
    setSelectedCity('All Cities');
    setSelectedSport('All Sports');
    setSortBy('popular');
    const today = todayISO();
    setSelectedDate(today);
    setSelectedSlot(getFirstUpcomingSlot(today));
    setDetectedCity(null);
    setGeoState('idle');
  };

  return (
    <div className="responsive-gap-sm" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Section Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          {geoState === 'success' && detectedCity
            ? <>All Venues near <span style={{ color: 'var(--primary)' }}>{detectedCity}</span></>
            : 'All Venues'
          }
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {processedVenues.length} venue{processedVenues.length !== 1 ? 's' : ''} available
          {selectedCity !== 'All Cities' ? ` in ${selectedCity}` : ''}
          {` • ${selectedDate}`}
          {selectedSlot !== 'All Slots' ? ` • ${selectedSlot.split(' – ')[0]}` : ' • all upcoming slots'}
          {` • sorted: most booked first`}
        </p>
      </div>

      {/* Geo Bar */}
      <div className="responsive-gap-sm" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Use My Location Button */}
        <button
          onClick={detectLocation}
          disabled={geoState === 'loading'}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '13px 18px', borderRadius: '14px', fontFamily: 'inherit',
            fontSize: '14px', fontWeight: '600', cursor: geoState === 'loading' ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            border: geoState === 'success' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
            background: geoState === 'success' ? 'rgba(22,163,74,0.08)' : 'var(--secondary)',
            color: geoState === 'success' ? 'var(--primary)' : 'var(--foreground)',
            transition: 'all 0.2s ease',
          }}
        >
          {geoState === 'loading'
            ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Detecting…</>
            : geoState === 'success'
            ? <><MapPin size={16} /> {detectedCity || 'Near Me'}</>
            : <><LocateFixed size={16} /> Use My Location</>
          }
        </button>

      </div>

      {/* Denied geolocation notice */}
      {geoState === 'denied' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '12px 16px', color: '#92400e', fontSize: '13px' }}>
          <MapPin size={15} />
          Location access was denied or unavailable. Please select a city manually below.
        </div>
      )}

      {/* Filters Panel — always expanded */}
        <div className="glass-morphism responsive-padding responsive-gap-sm" style={{ padding: '20px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* City */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>City</label>
            <select
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              <option value="All Cities">All Cities</option>
              {availableCities.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Sport */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Sport</label>
            <select
              value={selectedSport}
              onChange={e => setSelectedSport(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              <option value="All Sports">All Sports</option>
              {SPORTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Date */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Date</label>
            <input
              type="date"
              value={selectedDate}
              min={todayISO()}
              onChange={e => {
                const next = e.target.value;
                if (!next) return;
                setSelectedDate(next);
                // Auto-select first upcoming slot for the new date
                // (keeps a concrete selection when coming from All Slots or a passed slot)
                if (selectedSlot === 'All Slots' || slotHasPassed(selectedSlot, next)) {
                  const first = getFirstUpcomingSlot(next);
                  if (first) setSelectedSlot(first);
                }
              }}
              style={{ width: '100%', padding: '10px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            />
          </div>

          {/* Time Slot — only upcoming slots shown */}
          <div style={{ flex: '1', minWidth: '180px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>
              Time Slot {popLoading ? '(loading…)' : ''}
            </label>
            <select
              value={selectedSlot}
              onChange={e => setSelectedSlot(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              <option value="All Slots">All Slots (whole day)</option>
              {SLOTS.filter(s => !slotHasPassed(s, selectedDate)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sort By — after Time Slot */}
          <div style={{ flex: '1', minWidth: '160px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--muted)', marginBottom: '6px' }}>Sort By</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', background: 'var(--secondary)', border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--foreground)', fontFamily: 'inherit', fontSize: '14px' }}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

      {/* Sport Quick Pills */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
        <button
          onClick={() => setSelectedSport('All Sports')}
          style={{
            padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap',
            border: selectedSport === 'All Sports' ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
            background: selectedSport === 'All Sports' ? 'var(--primary)' : 'var(--secondary)',
            color: selectedSport === 'All Sports' ? 'white' : 'var(--foreground)',
            cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
          }}
        >All</button>
        {SPORTS.map(sport => (
          <button
            key={sport}
            onClick={() => setSelectedSport(sport)}
            style={{
              padding: '8px 18px', borderRadius: '100px', whiteSpace: 'nowrap',
              border: selectedSport === sport ? '1.5px solid var(--primary)' : '1.5px solid var(--glass-border)',
              background: selectedSport === sport ? 'var(--primary)' : 'var(--secondary)',
              color: selectedSport === sport ? 'white' : 'var(--foreground)',
              cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
          >{sport}</button>
        ))}
      </div>

      {/* Results Grid */}
      {processedVenues.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
          {processedVenues.map(venue => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '72px 20px', background: 'var(--secondary)', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
          <Search size={40} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>No available venues for this slot</h3>
          <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>All venues are full for {selectedSlot} on {selectedDate}. Try a different date or time.</p>
          <button onClick={clearAll} className="btn-primary" style={{ padding: '11px 28px', borderRadius: '12px' }}>
            Clear All Filters
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
