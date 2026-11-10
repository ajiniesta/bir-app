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
  usePathname: () => '/',
}));

const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

describe('Navbar (modernized top menu with mobile and user dropdown)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login and register links without user menu when user is anonymous', () => {
    render(<Navbar session={null} />);

    expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /registrarse/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /menú de usuario/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /administración/i })).not.toBeInTheDocument();
  });

  it('renders user name and toggles user dropdown with Perfil and Cerrar sesión', async () => {
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

    // User name trigger should be present
    const userMenuButton = screen.getByRole('button', { name: /demo/i });
    expect(userMenuButton).toBeInTheDocument();

    // Click user dropdown trigger to open menu
    await user.click(userMenuButton);

    // "Perfil" link should be visible in the dropdown
    const profileLink = screen.getByRole('link', { name: /perfil/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/profile');

    // "Cerrar sesión" button should be visible in the dropdown
    const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(logoutBtn).toBeInTheDocument();

    // Clicking logout triggers signOut
    await user.click(logoutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('toggles mobile menu drawer on hamburger button click', async () => {
    const user = userEvent.setup();

    render(
      <Navbar
        session={{
          user: { name: 'demo', role: 'CREATOR' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    const hamburgerBtn = screen.getByRole('button', { name: /abrir menú|cerrar menú/i });
    expect(hamburgerBtn).toBeInTheDocument();

    await user.click(hamburgerBtn);

    // In mobile menu, links should be present
    expect(screen.getAllByRole('link', { name: /modo libre/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole('link', { name: /simulacros/i }).length).toBeGreaterThanOrEqual(2);
  });

  it('renders theme toggle button', () => {
    render(<Navbar session={null} />);
    const themeBtns = screen.getAllByRole('button', { name: /cambiar tema|modo oscuro|modo claro/i });
    expect(themeBtns.length).toBeGreaterThan(0);
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

    const reviewsLink = screen.getByRole('link', { name: /revisiones/i });
    expect(reviewsLink).toBeInTheDocument();
    expect(reviewsLink).toHaveAttribute('href', '/revisiones');

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
    expect(screen.getByRole('link', { name: /revisiones/i })).toBeInTheDocument();
  });

  it('does NOT render Preguntas or Revisiones link when user is USER or unauthenticated', () => {
    const { unmount } = render(
      <Navbar
        session={{
          user: { name: 'student', role: 'USER' },
          expires: '2099-01-01T00:00:00.000Z',
        }}
      />
    );

    expect(screen.queryByRole('link', { name: /preguntas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /revisiones/i })).not.toBeInTheDocument();

    unmount();

    render(<Navbar session={null} />);
    expect(screen.queryByRole('link', { name: /preguntas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /revisiones/i })).not.toBeInTheDocument();
  });
});
