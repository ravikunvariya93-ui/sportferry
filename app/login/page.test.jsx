import React from 'react';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import LoginPage from './page';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockGetSession = jest.fn(async () => ({ user: { role: 'PLAYER' } }));

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(async () => ({ error: null })),
  getSession: () => mockGetSession(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const setQuery = (search) => {
  window.history.pushState({}, '', `/login${search}`);
};

beforeEach(() => {
  mockPush.mockClear();
  mockRefresh.mockClear();
});

afterEach(() => {
  cleanup();
  setQuery('');
});

describe('login page OAuth errors', () => {
  it('explains an OAuth failure instead of showing a dead end', async () => {
    setQuery('?error=email_in_use');
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText(/account already exists with this email/i)).toBeInTheDocument();
    });
  });

  it('falls back to a generic message for an unknown error code', async () => {
    setQuery('?error=SomethingElse');
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText(/sign-in failed/i)).toBeInTheDocument();
    });
  });

  it('shows no error when the URL carries none', async () => {
    setQuery('');
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
    expect(screen.queryByText(/sign-in failed/i)).toBeNull();
  });
});

describe('login page callbackUrl', () => {
  const signInWith = (username) => {
    fireEvent.change(screen.getByPlaceholderText(/username or email/i), { target: { value: username } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
  };

  it('returns to the ticket the user asked for', async () => {
    setQuery('?callbackUrl=%2Fbookings%2F6ada49d5471a246fddf18235');
    render(<LoginPage />);
    await waitFor(() => screen.getByRole('button', { name: /^sign in$/i }));
    signInWith('finprez5@gmail.com');
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/bookings/6ada49d5471a246fddf18235');
    });
  });

  it('ignores an absolute redirect target', async () => {
    setQuery('?callbackUrl=https%3A%2F%2Fevil.example.com');
    render(<LoginPage />);
    await waitFor(() => screen.getByRole('button', { name: /^sign in$/i }));
    signInWith('finprez5@gmail.com');
    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalledWith('https://evil.example.com');
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
