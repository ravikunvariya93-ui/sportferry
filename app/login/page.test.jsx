import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import LoginPage from './page';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(async () => ({ error: null })),
  getSession: jest.fn(async () => null),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

const setQuery = (search) => {
  window.history.pushState({}, '', `/login${search}`);
};

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
