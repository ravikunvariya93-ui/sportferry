/**
 * Timezone + slot helpers shared by server routes and client components.
 *
 * This module is intentionally pure (no DB/model imports) so it is safe to
 * bundle into the browser. Every venue schedule in the product is expressed in
 * IST (UTC+5:30).
 */

export const IST_OFFSET_MINUTES = 330; // +05:30
export const IST_OFFSET_MS = IST_OFFSET_MINUTES * 60 * 1000;

export const FIRST_SLOT_HOUR = 6; // 06:00
export const LAST_SLOT_HOUR = 23; // 23:00 – 00:00

const EN_DASH = '\u2013';

/** Convert a 24h time "HH:mm" to 12h "hh:mm AM/PM". */
export function formatToAMPM(timeStr, { padHour = true } = {}) {
  if (!timeStr) return '';
  let [h, m] = timeStr.split(':').map(Number);
  const meridiem = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${padHour ? String(h).padStart(2, '0') : h}:${String(m).padStart(2, '0')} ${meridiem}`;
}

export function addDaysISO(dateISO, days) {
  const date = istDateToUTC(dateISO);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function visibleISODates(dateISO, view = 'Day') {
  if (view === 'Day') return [dateISO];
  const date = istDateToUTC(dateISO);
  if (view === 'Week') {
    const monday = new Date(date);
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setUTCDate(day.getUTCDate() + i);
      return day.toISOString().slice(0, 10);
    });
  }
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => new Date(Date.UTC(year, month, i + 1)).toISOString().slice(0, 10));
}

export function formatSlotLabel(startTime, endTime, { ampm = true } = {}) {
  if (!startTime || !endTime) return '';
  const start = ampm ? formatToAMPM(startTime) : startTime;
  const end = ampm ? formatToAMPM(endTime) : endTime;
  return `${start} ${EN_DASH} ${end}`;
}

export function formatBookingDate(value, { day = 'numeric', weekday = false, timeZone, year = true } = {}) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-IN', {
    ...(timeZone ? { timeZone } : {}),
    ...(weekday ? { weekday: 'short' } : {}),
    day,
    month: 'short',
    ...(year ? { year: 'numeric' } : {}),
  });
}

export function dateToISTDateISO(value) {
  return new Date(new Date(value).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function formatDateDDMMYYYY(iso) {
  if (!iso) return '';
  const [year, month, day] = String(iso).split('-');
  return `${day}-${month}-${year}`;
}

export function buildDateChips(count = 30, now = new Date()) {
  return Array.from({ length: count }, (_, i) => {
    const iso = istDateISO(i, now);
    const date = istDateToUTC(iso);
    return {
      iso,
      label: formatDateDDMMYYYY(iso),
      dayName: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }),
      dayNum: String(date.getUTCDate()).padStart(2, '0'),
      monthShort: date.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }),
    };
  });
}

export function bookableStartTimes() {
  return Array.from(
    { length: LAST_SLOT_HOUR - FIRST_SLOT_HOUR + 1 },
    (_, i) => `${String(FIRST_SLOT_HOUR + i).padStart(2, '0')}:00`
  );
}

/** Parse a slot label like "06:00 AM – 07:00 AM" into 24h startTime/endTime. */
export function parseSlot(slot) {
  if (!slot || typeof slot !== 'string') return null;

  // Split on en-dash, em-dash or hyphen.
  const parts = slot.split(/\s*[\u2013\u2014-]\s*|\s+-\s+/).map((s) => s.trim()).filter(Boolean);
  let p = parts;
  if (p.length !== 2) {
    // Last resort: two "H:mm AM/PM" tokens.
    const tokens = slot.match(/(\d{1,2}:\d{2}\s*[AP]M)/gi);
    if (tokens && tokens.length === 2) p = tokens.map((t) => t.trim());
  }
  if (p.length !== 2) return null;

  const to24h = (timeStr) => {
    const [time, meridiem] = timeStr.split(' ');
    let [h, m] = time.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  return { startTime: to24h(p[0]), endTime: to24h(p[1]) };
}

const hourLabel = (h) => formatToAMPM(`${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`);

/** The canonical list of bookable 1-hour slots for a day. */
export const SLOT_LABELS = (() => {
  const labels = [];
  for (let h = FIRST_SLOT_HOUR; h <= LAST_SLOT_HOUR; h++) {
    labels.push(`${hourLabel(h)} ${EN_DASH} ${hourLabel(h + 1)}`);
  }
  return labels;
})();

/** Current date (YYYY-MM-DD) in IST, independent of the host timezone. */
export function istDateISO(addDays = 0, now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS + addDays * 86400000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`;
}

/** Current date (YYYY-MM-DD) in IST. */
export function istTodayISO(now = new Date()) {
  return istDateISO(0, now);
}

/** True only for a real calendar date in YYYY-MM-DD form. */
export function isValidDateISO(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Current hour (0-23) in IST, independent of the host timezone. */
export function istHour(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).getUTCHours();
}

/**
 * UTC range covering one full IST calendar day (midnight to midnight IST).
 * Returns { startUTC, endUTC }.
 */
export function getISTDayRange(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  // Midnight IST = 18:30 UTC on the previous day.
  const startUTC = new Date(Date.UTC(year, month - 1, day - 1, 18, 30, 0, 0));
  // End of IST day = 18:29:59.999 UTC on the same calendar day.
  const endUTC = new Date(Date.UTC(year, month - 1, day, 18, 29, 59, 999));
  return { startUTC, endUTC };
}

/**
 * Midnight UTC for an IST calendar date (YYYY-MM-DD). This is the exact shape
 * stored in `Booking.date` and `BlockedSlot.date`.
 */
export function istDateToUTC(dateString) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Real UTC instant for an IST date (YYYY-MM-DD) + 24h start time ("HH:mm"). */
export function slotStartInstant(dateString, startTime) {
  const [year, month, day] = dateString.split('-').map(Number);
  const [hours, minutes] = (startTime || '00:00').split(':').map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours, minutes) - IST_OFFSET_MS);
}

/** True if the IST slot has already started relative to `now`. */
export function isSlotPast(dateString, startTime, now = new Date()) {
  return slotStartInstant(dateString, startTime).getTime() <= now.getTime();
}

/** True if a slot label (e.g. "06:00 AM – 07:00 AM") has started on `dateISO`. */
export function isSlotLabelPast(slotLabel, dateISO, now = new Date()) {
  const times = parseSlot(slotLabel);
  return times ? isSlotPast(dateISO, times.startTime, now) : false;
}

export function upcomingSlotLabels(dateISO, now = new Date()) {
  return SLOT_LABELS.filter(label => !isSlotLabelPast(label, dateISO, now));
}

export function firstUpcomingSlotLabel(dateISO, now = new Date()) {
  return upcomingSlotLabels(dateISO, now)[0] || null;
}

/**
 * Parse a slot that may actually be booked.
 *
 * A bookable slot is one 1-hour slot inside the venue grid (06:00–23:00 IST).
 * "06:00 AM – 11:00 PM" (17 hours) or "02:00 AM – 03:00 AM" (closed) are
 * rejected — both used to slip through the online booking route.
 *
 * @returns {{ startTime: string, endTime: string } | null}
 */
export function parseBookableSlot(slot) {
  const times = parseSlot(slot);
  if (!times) return null;

  const [startH, startM] = times.startTime.split(':').map(Number);
  const [endH, endM] = times.endTime.split(':').map(Number);
  if ([startH, startM, endH, endM].some(n => !Number.isFinite(n))) return null;

  // "00:00" as an end time means midnight of the next day.
  const endHAdjusted = endH === 0 ? 24 : endH;
  const duration = (endHAdjusted * 60 + endM) - (startH * 60 + startM);
  if (duration !== 60) return null;

  if (startH < FIRST_SLOT_HOUR || startH > LAST_SLOT_HOUR) return null;

  return times;
}
