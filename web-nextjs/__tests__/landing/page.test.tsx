import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LandingPage from '@/app/page';
import { auth } from '@/auth';

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

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.Mock;

describe('LandingPage (/)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders the main heading BirApp and residency exam description for anonymous users', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await LandingPage();
    render(Component);

    const heading = screen.getByRole('heading', { name: /BirApp/i, level: 1 });
    expect(heading).toBeInTheDocument();

    const description = screen.getByText(
      /Banco de preguntas tipo test para las oposiciones MIR, EIR, BIR, FIR, PIR, QIR y RFIR/i
    );
    expect(description).toBeInTheDocument();
  });

  it('renders CTA buttons for unauthenticated visitors (register and login) and no logout button', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await LandingPage();
    render(Component);

    const registerBtn = screen.getByRole('link', { name: /crear una cuenta/i });
    expect(registerBtn).toBeInTheDocument();
    expect(registerBtn).toHaveAttribute('href', '/register');

    const loginBtns = screen.getAllByRole('link', { name: /iniciar sesión/i });
    expect(loginBtns.length).toBeGreaterThanOrEqual(1);
    expect(loginBtns.some((btn) => btn.getAttribute('href') === '/login')).toBe(true);

    expect(screen.queryByRole('button', { name: /cerrar sesión/i })).not.toBeInTheDocument();
  });

  it('does NOT render the question banks section for anonymous users', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await LandingPage();
    render(Component);

    expect(screen.queryByRole('heading', { name: /banco de preguntas/i })).not.toBeInTheDocument();
    expect(screen.queryByText('MIR')).not.toBeInTheDocument();
    expect(screen.queryByText('BIR')).not.toBeInTheDocument();
    expect(screen.queryByText('EIR')).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders ONLY the question banks the authenticated user has permission to access', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'alumno1',
        role: 'USER',
        accessToken: 'jwt-token-alumno1',
      },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalQuestions: 45,
        byExamType: [
          { code: 'BIR', name: 'Biólogo Interno Residente', total: 30 },
          { code: 'MIR', name: 'Médico Interno Residente', total: 15 },
        ],
      }),
    });

    const Component = await LandingPage();
    render(Component);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/stats/banks'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-token-alumno1',
        }),
      })
    );

    const sectionTitle = screen.getByRole('heading', { name: /banco de preguntas/i });
    expect(sectionTitle).toBeInTheDocument();

    // Permitted banks are visible
    expect(screen.getByText('BIR')).toBeInTheDocument();
    expect(screen.getByText('Biólogo Interno Residente')).toBeInTheDocument();
    expect(screen.getByText('MIR')).toBeInTheDocument();
    expect(screen.getByText('Médico Interno Residente')).toBeInTheDocument();

    // Unpermitted banks are NOT visible
    expect(screen.queryByText('EIR')).not.toBeInTheDocument();
    expect(screen.queryByText('FIR')).not.toBeInTheDocument();
    expect(screen.queryByText('PIR')).not.toBeInTheDocument();
    expect(screen.queryByText('QIR')).not.toBeInTheDocument();
    expect(screen.queryByText('RFIR')).not.toBeInTheDocument();
  });

  it('shows empty state message when authenticated user has no assigned question banks', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'nuevo_user',
        role: 'USER',
        accessToken: 'jwt-token-empty',
      },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalQuestions: 0,
        byExamType: [],
      }),
    });

    const Component = await LandingPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /banco de preguntas/i })).toBeInTheDocument();
    expect(
      screen.getByText(/No tienes bancos de preguntas asignados\. Pide a un administrador que te asigne uno\./i)
    ).toBeInTheDocument();
  });

  it('renders Logout option on the Landing Page when user is logged in and logs out on click', async () => {
    const user = userEvent.setup();
    mockSignOut.mockResolvedValueOnce(undefined);
    mockAuth.mockResolvedValue({
      user: {
        name: 'alumno1',
        role: 'USER',
        accessToken: 'jwt-token-alumno1',
      },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        totalQuestions: 10,
        byExamType: [{ code: 'BIR', name: 'Biólogo Interno Residente', total: 10 }],
      }),
    });

    const Component = await LandingPage();
    render(Component);

    const logoutBtn = screen.getByRole('button', { name: /cerrar sesión/i });
    expect(logoutBtn).toBeInTheDocument();

    await user.click(logoutBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });
});
