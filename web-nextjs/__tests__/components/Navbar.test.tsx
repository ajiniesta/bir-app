import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Navbar from '@/app/components/Navbar';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('Navbar (shared across all views)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login and register links without Logout button when user is anonymous', () => {
    render(<Navbar session={null} />);

    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /registrarse/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administración/i })).not.toBeInTheDocument();
  });

  it('renders user name and Logout button when user is logged in and triggers signOut on click', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValueOnce(undefined);

    render(
      <Navbar
        session={{
          user: { name: 'demo', role: 'CREATOR' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administración/i })).not.toBeInTheDocument();
    const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(logoutBtn).toBeInTheDocument();

    await user.click(logoutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('renders Administración link (/admin/users) ONLY when logged-in user has role ADMIN', () => {
    render(
      <Navbar
        session={{
          user: { name: 'admin', role: 'ADMIN' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    const adminLink = screen.getByRole('link', { name: /administración/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/admin/users');
  });

  it('renders Preguntas link (/questions) when logged-in user is ADMIN or CREATOR', () => {
    const { unmount } = render(
      <Navbar
        session={{
          user: { name: 'creator', role: 'CREATOR' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    const questionsLink = screen.getByRole('link', { name: /preguntas/i });
    expect(questionsLink).toBeInTheDocument();
    expect(questionsLink).toHaveAttribute('href', '/questions');

    unmount();

    render(
      <Navbar
        session={{
          user: { name: 'admin', role: 'ADMIN' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    expect(screen.getByRole('link', { name: /preguntas/i })).toBeInTheDocument();
  });

  it('does NOT render Preguntas link when user is USER or unauthenticated', () => {
    const { unmount } = render(
      <Navbar
        session={{
          user: { name: 'student', role: 'USER' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    expect(screen.queryByRole('link', { name: /preguntas/i })).not.toBeInTheDocument();

    unmount();

    render(<Navbar session={null} />);
    expect(screen.queryByRole('link', { name: /preguntas/i })).not.toBeInTheDocument();
  });
});
