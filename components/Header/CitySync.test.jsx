import React from 'react';
import { render, act } from '@testing-library/react';
import CitySync from './CitySync';

const CITY_KEY = 'sportferry_city';

beforeEach(() => {
  localStorage.clear();
});

describe('CitySync: seeds the browsing city from the profile', () => {
  test('writes the profile city when localStorage is empty and notifies listeners', () => {
    const onSet = jest.fn();
    window.addEventListener('sportferry:citySet', onSet);

    render(<CitySync defaultCity="Ahmedabad" />);

    expect(localStorage.getItem(CITY_KEY)).toBe('Ahmedabad');
    expect(onSet).toHaveBeenCalledTimes(1);
    expect(onSet.mock.calls[0][0].detail).toEqual({ city: 'Ahmedabad' });

    window.removeEventListener('sportferry:citySet', onSet);
  });

  test('never overwrites an explicit city already chosen', () => {
    localStorage.setItem(CITY_KEY, 'Mumbai');
    const onSet = jest.fn();
    window.addEventListener('sportferry:citySet', onSet);

    render(<CitySync defaultCity="Ahmedabad" />);

    expect(localStorage.getItem(CITY_KEY)).toBe('Mumbai');
    expect(onSet).not.toHaveBeenCalled();

    window.removeEventListener('sportferry:citySet', onSet);
  });

  test('does nothing when the profile has no city', () => {
    const onSet = jest.fn();
    window.addEventListener('sportferry:citySet', onSet);

    render(<CitySync defaultCity={null} />);

    expect(localStorage.getItem(CITY_KEY)).toBeNull();
    expect(onSet).not.toHaveBeenCalled();

    window.removeEventListener('sportferry:citySet', onSet);
  });
});
