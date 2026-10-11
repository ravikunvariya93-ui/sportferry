import { getPlayerLevel, getAchievements, LEVELS } from './playerLevel';

describe('getPlayerLevel', () => {
  it('starts everyone at level 1 (Rookie)', () => {
    const result = getPlayerLevel(0);
    expect(result.level).toBe(1);
    expect(result.name).toBe('Rookie');
    expect(result.nextLevel).toBe(2);
    expect(result.gamesToNext).toBe(3);
    expect(result.progress).toBe(0);
  });

  it('treats missing / invalid / negative input as 0 games', () => {
    expect(getPlayerLevel().level).toBe(1);
    expect(getPlayerLevel(undefined).level).toBe(1);
    expect(getPlayerLevel(-10).level).toBe(1);
    expect(getPlayerLevel('not-a-number').level).toBe(1);
  });

  it('promotes at each threshold', () => {
    expect(getPlayerLevel(3).name).toBe('Amateur');
    expect(getPlayerLevel(10).name).toBe('Regular');
    expect(getPlayerLevel(25).name).toBe('Pro');
    expect(getPlayerLevel(50).name).toBe('Legend');
  });

  it('holds the highest tier below the next threshold', () => {
    expect(getPlayerLevel(2).name).toBe('Rookie');
    expect(getPlayerLevel(9).name).toBe('Amateur');
    expect(getPlayerLevel(49).name).toBe('Pro');
  });

  it('computes progress within a tier', () => {
    expect(getPlayerLevel(1).progress).toBe(33); // 1 of 3 toward Amateur
    expect(getPlayerLevel(2).progress).toBe(67);
    expect(getPlayerLevel(6).progress).toBe(43); // (6-3)/(10-3)
  });

  it('caps at 100% for max level', () => {
    const result = getPlayerLevel(50);
    expect(result.level).toBe(5);
    expect(result.nextLevel).toBeNull();
    expect(result.gamesToNext).toBe(0);
    expect(result.progress).toBe(100);
  });

  it('exposes ascending thresholds', () => {
    for (let i = 1; i < LEVELS.length; i += 1) {
      expect(LEVELS[i].min).toBeGreaterThan(LEVELS[i - 1].min);
    }
  });
});

describe('getAchievements', () => {
  it('always unlocks Welcome Aboard, even with no activity', () => {
    const badges = getAchievements({});
    const welcome = badges.find((b) => b.id === 'welcome');
    expect(welcome.earned).toBe(true);
    expect(badges.filter((b) => b.earned)).toHaveLength(1);
  });

  it('unlocks game milestones as games played rises', () => {
    const earned = (games) =>
      getAchievements({ gamesPlayed: games }).filter((b) => b.earned).map((b) => b.id);
    expect(earned(1)).toContain('first-game');
    expect(earned(1)).not.toContain('ten-games');
    expect(earned(10)).toEqual(expect.arrayContaining(['first-game', 'ten-games']));
    expect(earned(50)).toEqual(
      expect.arrayContaining(['first-game', 'ten-games', 'twenty-five', 'fifty-games'])
    );
  });

  it('unlocks Explorer at 3 venues', () => {
    expect(getAchievements({ venues: 2 }).find((b) => b.id === 'explorer').earned).toBe(false);
    expect(getAchievements({ venues: 3 }).find((b) => b.id === 'explorer').earned).toBe(true);
  });

  it('unlocks Regular at 6 months', () => {
    expect(getAchievements({ memberMonths: 5 }).find((b) => b.id === 'regular').earned).toBe(false);
    expect(getAchievements({ memberMonths: 6 }).find((b) => b.id === 'regular').earned).toBe(true);
  });

  it('unlocks Team Player with an upcoming game', () => {
    expect(getAchievements({ upcoming: 0 }).find((b) => b.id === 'team-player').earned).toBe(false);
    expect(getAchievements({ upcoming: 1 }).find((b) => b.id === 'team-player').earned).toBe(true);
  });
});
