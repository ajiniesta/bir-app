import { render, screen } from '@testing-library/react';
import EstadisticasPage from '@/app/estadisticas/page';
import { auth } from '@/auth';

const mockPush = jest.fn();
const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.Mock;

const MOCK_STATS_USER = {
  mine: {
    freeSessions: 4,
    mockAttempts: 1,
    answered: 25,
    correct: 20,
    accuracy: 80.0,
    byCategory: [
      {
        category: 'Cardiología',
        answered: 15,
        correct: 12,
        accuracy: 80.0,
      },
      {
        category: 'Bioquímica',
        answered: 10,
        correct: 8,
        accuracy: 80.0,
      },
    ],
  },
  global: null,
};

const MOCK_STATS_ADMIN = {
  mine: {
    freeSessions: 2,
    mockAttempts: 1,
    answered: 5,
    correct: 3,
    accuracy: 60.0,
    byCategory: [
      {
        category: 'Anatomía',
        answered: 5,
        correct: 3,
        accuracy: 60.0,
      },
    ],
  },
  global: {
    users: 8,
    freeSessions: 14,
    mockAttempts: 6,
    answered: 120,
    correct: 90,
    accuracy: 75.0,
    byCategory: [
      {
        category: 'Anatomía',
        answered: 60,
        correct: 45,
        accuracy: 75.0,
      },
    ],
    byUser: [
      {
        username: 'demo_user',
        displayName: 'Demo User',
        answered: 70,
        correct: 55,
        accuracy: 78.6,
      },
      {
        username: 'admin_user',
        displayName: 'Admin User',
        answered: 50,
        correct: 35,
        accuracy: 70.0,
      },
    ],
  },
};

describe('EstadisticasPage (/estadisticas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await EstadisticasPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders personal stats without global section for standard USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'regular_user', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_STATS_USER,
    });

    const Component = await EstadisticasPage();
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: /estadísticas/i })).toBeInTheDocument();
    expect(screen.getByText(/tu progreso por categoría/i)).toBeInTheDocument();

    // Quick links
    const freeLinks = screen.getAllByRole('link', { name: /modo libre/i });
    expect(freeLinks.some((l) => l.getAttribute('href') === '/free')).toBe(true);
    const simulacrosLinks = screen.getAllByRole('link', { name: /simulacros/i });
    expect(simulacrosLinks.some((l) => l.getAttribute('href') === '/simulacros')).toBe(true);

    // Personal Summary Cards
    expect(screen.getByText('Partidas')).toBeInTheDocument();
    expect(screen.getAllByText('Simulacros').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Respondidas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Acertadas').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('% acierto').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('80.0%').length).toBeGreaterThanOrEqual(1);

    // Personal Category Table
    expect(screen.getByRole('heading', { level: 2, name: /tus resultados por categoría/i })).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByText('Bioquímica')).toBeInTheDocument();

    // Must NOT display global section
    expect(screen.queryByText(/estadísticas globales/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resultados globales por categoría/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/resultados por usuario/i)).not.toBeInTheDocument();
  });

  it('renders global stats and user activity table for ADMIN or CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_STATS_ADMIN,
    });

    const Component = await EstadisticasPage();
    render(Component);

    // Personal section
    expect(screen.getByRole('heading', { level: 2, name: /tus resultados por categoría/i })).toBeInTheDocument();
    expect(screen.getAllByText('60.0%').length).toBeGreaterThanOrEqual(1);

    // Global section
    expect(screen.getByRole('heading', { level: 2, name: /estadísticas globales/i })).toBeInTheDocument();
    expect(screen.getByText(/usuarios activos/i)).toBeInTheDocument();
    expect(screen.getAllByText('75.0%').length).toBeGreaterThanOrEqual(1);

    // Global Category section
    expect(screen.getByText(/resultados globales por categoría/i)).toBeInTheDocument();

    // User breakdown section
    expect(screen.getByText(/resultados por usuario/i)).toBeInTheDocument();
    expect(screen.getByText('Demo User')).toBeInTheDocument();
    expect(screen.getByText('(demo_user)')).toBeInTheDocument();
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('(admin_user)')).toBeInTheDocument();
  });

  it('renders empty message when user has no recorded categories', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'new_user', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-new' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        mine: {
          freeSessions: 0,
          mockAttempts: 0,
          answered: 0,
          correct: 0,
          accuracy: 0.0,
          byCategory: [],
        },
        global: null,
      }),
    });

    const Component = await EstadisticasPage();
    render(Component);

    expect(screen.getByText(/todavía no hay categorías ni respuestas registradas/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /empieza una partida/i })).toHaveAttribute('href', '/free');
  });

  it('displays error message if API fails', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'regular_user', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const Component = await EstadisticasPage();
    render(Component);

    expect(screen.getByText(/no se pudieron cargar las estadísticas/i)).toBeInTheDocument();
  });
});
