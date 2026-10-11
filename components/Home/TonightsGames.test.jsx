import React from 'react';
import { render, screen } from '@testing-library/react';
import TonightsGames from './TonightsGames';
import { CITY_KEY } from '@/lib/location';

const venue = (id, name, city) => ({
  id, name, city, area: 'Somewhere', images: [], pricePerHour: 1000, rating: 4.5, numberOfTurfs: 3,
});
const game = (joined) => [{ startTime: '20:00', endTime: '21:00', joined, maxPlayers: 36, spotsLeft: 36 - joined }];

const cardOrder = () => screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);

beforeEach(() => {
  localStorage.clear();
});

describe('TonightsGames: nearby-first ordering', () => {
  const venues = [
    venue('a', 'Ahmedabad Turf', 'Ahmedabad'),
    venue('b', 'Bhavnagar Turf', 'Bhavnagar'),
  ];
  // Ahmedabad has more players (would normally rank first).
  const venueGames = { a: game(10), b: game(0) };

  test('a venue in the browsing city outranks a fuller game elsewhere', () => {
    localStorage.setItem(CITY_KEY, 'Bhavnagar');
    render(<TonightsGames venues={venues} venueGames={venueGames} date="2026-01-01" />);
    expect(cardOrder()).toEqual(['Bhavnagar Turf', 'Ahmedabad Turf']);
  });

  test('with no browsing city, fuller games come first', () => {
    render(<TonightsGames venues={venues} venueGames={venueGames} date="2026-01-01" />);
    expect(cardOrder()).toEqual(['Ahmedabad Turf', 'Bhavnagar Turf']);
  });
});
