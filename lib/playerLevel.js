/**
 * Sportferry — player activity level + achievements.
 *
 * Pure helpers (no DB/model imports) so they are safe on the client and easy to
 * unit-test. A player's level is derived from the number of games they have
 * played — nothing is stored on the user document.
 */

export const LEVELS = [
  { level: 1, name: 'Rookie', min: 0 },
  { level: 2, name: 'Amateur', min: 3 },
  { level: 3, name: 'Regular', min: 10 },
  { level: 4, name: 'Pro', min: 25 },
  { level: 5, name: 'Legend', min: 50 },
];

const toCount = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/**
 * Resolve a player's level from the number of games they have played.
 * Returns the current level, its name, and progress toward the next level.
 */
export function getPlayerLevel(gamesPlayed = 0) {
  const games = toCount(gamesPlayed);

  let current = LEVELS[0];
  for (const tier of LEVELS) {
    if (games >= tier.min) current = tier;
  }

  const next = LEVELS.find((tier) => tier.min > games) || null;

  const progress = next
    ? Math.round(((games - current.min) / (next.min - current.min)) * 100)
    : 100;

  return {
    level: current.level,
    name: current.name,
    gamesPlayed: games,
    nextLevel: next ? next.level : null,
    gamesToNext: next ? next.min - games : 0,
    progress,
  };
}

/**
 * Earned/locked badges for a player. Every badge is always returned so the UI
 * can render locked ones as goals.
 */
export function getAchievements({ gamesPlayed = 0, upcoming = 0, venues = 0, memberMonths = 0 } = {}) {
  const games = toCount(gamesPlayed);
  const upcomingCount = toCount(upcoming);
  const venueCount = toCount(venues);
  const months = toCount(memberMonths);

  return [
    { id: 'welcome', label: 'Welcome Aboard', desc: 'Joined Sportferry', icon: '🎉', earned: true },
    { id: 'first-game', label: 'First Game', desc: 'Play 1 game', icon: '🏏', earned: games >= 1 },
    { id: 'ten-games', label: 'Getting Serious', desc: 'Play 10 games', icon: '🔥', earned: games >= 10 },
    { id: 'twenty-five', label: 'Veteran', desc: 'Play 25 games', icon: '💪', earned: games >= 25 },
    { id: 'fifty-games', label: 'Legend', desc: 'Play 50 games', icon: '👑', earned: games >= 50 },
    { id: 'explorer', label: 'Explorer', desc: 'Play at 3 venues', icon: '🧭', earned: venueCount >= 3 },
    { id: 'regular', label: 'Regular', desc: 'Member for 6+ months', icon: '🗓️', earned: months >= 6 },
    { id: 'team-player', label: 'Team Player', desc: 'Have an upcoming game', icon: '🤝', earned: upcomingCount >= 1 },
  ];
}
