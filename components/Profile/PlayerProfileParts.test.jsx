import React from 'react';
import { render, screen } from '@testing-library/react';
import LevelBadge from './LevelBadge';
import LevelProgress from './LevelProgress';
import PlayerStats from './PlayerStats';
import PlayerAchievements from './PlayerAchievements';
import { getPlayerLevel, getAchievements } from '@/lib/playerLevel';

describe('LevelBadge', () => {
  test('shows the level number and name', () => {
    render(<LevelBadge level={getPlayerLevel(10)} />);
    expect(screen.getByText(/Level 3 · Regular/)).toBeInTheDocument();
  });

  test('renders nothing without a level', () => {
    const { container } = render(<LevelBadge level={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('LevelProgress', () => {
  test('shows games remaining to the next level', () => {
    render(<LevelProgress level={getPlayerLevel(1)} />);
    expect(screen.getByText(/2 games to Level 2/)).toBeInTheDocument();
  });

  test('shows max level message at the top tier', () => {
    render(<LevelProgress level={getPlayerLevel(50)} />);
    expect(screen.getByText(/Max level reached/)).toBeInTheDocument();
  });
});

describe('PlayerStats', () => {
  test('renders each stat value and label', () => {
    render(<PlayerStats gamesPlayed={7} upcoming={2} venues={4} />);
    expect(screen.getByText('Games Played')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Venues Played')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});

describe('PlayerAchievements', () => {
  test('shows the unlocked count and every badge', () => {
    const achievements = getAchievements({ gamesPlayed: 10, venues: 3, upcoming: 1, memberMonths: 6 });
    render(<PlayerAchievements achievements={achievements} />);

    const earned = achievements.filter((a) => a.earned).length;
    expect(screen.getByText(`${earned} / ${achievements.length} unlocked`)).toBeInTheDocument();
    expect(screen.getByText('First Game')).toBeInTheDocument();
    expect(screen.getByText('Welcome Aboard')).toBeInTheDocument();
  });
});
