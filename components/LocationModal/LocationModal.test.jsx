import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import LocationModal from './LocationModal';

const CITY_KEY = 'sportferry_city';
const SKIPPED_KEY = 'sportferry_location_skipped';

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  cleanup();
  jest.useRealTimers();
});

// Renders the modal and fast-forwards past the 600ms show delay
const renderPrompt = () => {
  render(<LocationModal />);
  act(() => {
    jest.advanceTimersByTime(700);
  });
};

const heading = () => screen.queryByRole('heading', { name: /where are you playing/i });

describe('LocationModal auto-show rules', () => {
  test('shows when no city saved and not previously dismissed', () => {
    renderPrompt();
    expect(heading()).toBeInTheDocument();
  });

  test('does not show when a city is already saved', () => {
    localStorage.setItem(CITY_KEY, 'Surat');
    renderPrompt();
    expect(heading()).toBeNull();
  });

  test('does not show when previously dismissed with "don\'t show again"', () => {
    localStorage.setItem(SKIPPED_KEY, '1');
    renderPrompt();
    expect(heading()).toBeNull();
  });
});

describe('LocationModal "Don\'t show again" option', () => {
  test('checkbox is present and checked by default', () => {
    renderPrompt();
    expect(screen.getByRole('checkbox', { name: /don't show again/i })).toBeChecked();
  });

  test('"Not now" with checkbox checked persists the dismissal', () => {
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: /not now/i }));

    expect(localStorage.getItem(SKIPPED_KEY)).toBe('1');
    expect(heading()).toBeNull();

    // Fresh visit (new mount) stays hidden
    cleanup();
    renderPrompt();
    expect(heading()).toBeNull();
  });

  test('"Not now" with checkbox unchecked shows the prompt again next visit', () => {
    renderPrompt();
    const checkbox = screen.getByRole('checkbox', { name: /don't show again/i });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /not now/i }));
    expect(localStorage.getItem(SKIPPED_KEY)).toBeNull();
    expect(heading()).toBeNull();

    // Fresh visit (new mount) prompts again
    cleanup();
    renderPrompt();
    expect(heading()).toBeInTheDocument();
  });

  test('close (X) button dismisses and persists when checkbox is checked', () => {
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(localStorage.getItem(SKIPPED_KEY)).toBe('1');
    expect(heading()).toBeNull();
  });

  test('detect and manual-choice buttons are offered', () => {
    renderPrompt();
    expect(screen.getByRole('button', { name: /detect my location/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose city manually/i })).toBeInTheDocument();
  });
});

describe('LocationModal city search', () => {
  const openCitySearch = () => {
    renderPrompt();
    fireEvent.click(screen.getByRole('button', { name: /choose city manually/i }));
    return screen.getByPlaceholderText(/type a city/i);
  };

  test('searches across India and shows the matching city with its state', () => {
    const input = openCitySearch();
    fireEvent.change(input, { target: { value: 'bhavnagar' } });

    const result = screen.getByRole('button', { name: /bhavnagar/i });
    expect(result).toBeInTheDocument();
    expect(result).toHaveTextContent(/gujarat/i);
  });

  test('saving a searched city persists it under CITY_KEY', () => {
    const input = openCitySearch();
    fireEvent.change(input, { target: { value: 'bhavnagar' } });
    fireEvent.click(screen.getByRole('button', { name: /bhavnagar/i }));

    expect(localStorage.getItem(CITY_KEY)).toBe('Bhavnagar');
  });

  test('shows an empty-state message for an unknown city', () => {
    const input = openCitySearch();
    fireEvent.change(input, { target: { value: 'zzzzz' } });

    expect(screen.getByText(/no cities named/i)).toBeInTheDocument();
  });
});
