import React from 'react';
import { render, screen } from '@testing-library/react';
import MobileHeader from './MobileHeader';
import { useSession } from 'next-auth/react';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

let mockPath = '/';
jest.mock('next/navigation', () => ({
  usePathname: () => mockPath,
}));

describe('MobileHeader: single Log In button OR avatar', () => {
  test('signed out shows one Log In link, no Register link or avatar', () => {
    mockPath = '/';
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    render(<MobileHeader />);

    const login = screen.getByRole('link', { name: 'Log In' });
    expect(login).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: 'Register' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Sign In' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Profile' })).toBeNull();
  });

  test('signed in shows the avatar and hides the Log In button', () => {
    mockPath = '/';
    useSession.mockReturnValue({ data: { user: { name: 'Priya Sharma' } }, status: 'authenticated' });
    render(<MobileHeader />);

    const avatar = screen.getByRole('link', { name: 'Profile' });
    expect(avatar).toHaveAttribute('href', '/profile');
    expect(avatar).toHaveTextContent('P');
    expect(screen.queryByRole('link', { name: 'Log In' })).toBeNull();
  });

  test('avatar falls back to a person icon when the user has no name', () => {
    mockPath = '/';
    useSession.mockReturnValue({ data: { user: {} }, status: 'authenticated' });
    render(<MobileHeader />);

    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log In' })).toBeNull();
  });

  test('header stays hidden on /admin routes', () => {
    mockPath = '/admin';
    useSession.mockReturnValue({ data: null, status: 'unauthenticated' });
    const { container } = render(<MobileHeader />);

    expect(container.querySelector('header')).toBeNull();
  });
});
