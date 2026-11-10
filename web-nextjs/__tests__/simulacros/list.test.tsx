import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulacrosPage from '@/app/simulacros/page';
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

const MOCK_SIMULACROS = [
  {
    id: 1,
    title: 'Simulacro MIR 2026 - Bloque 1',
    description: 'Examen de prueba oficial con 200 preguntas.',
    examTypeCode: 'MIR',
    examTypeName: 'Médico Interno Residente',
    questionCount: 200,
    attemptCount: 3,
    finishedCount: 2,
    bestAccuracy: 85.5,
    inProgressAttemptId: null,
  },
  {
    id: 2,
    title: 'Simulacro BIR 2025 - General',
    description: 'Preguntas representativas de biología celular.',
    examTypeCode: 'BIR',
    examTypeName: 'Biólogo Interno Residente',
    questionCount: 150,
    attemptCount: 1,
    finishedCount: 0,
    bestAccuracy: null,
    inProgressAttemptId: 42,
  },
];

describe('SimulacrosPage (/simulacros)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await SimulacrosPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders mock exams list for standard USER without "+ Nuevo simulacro" button', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'regular_user', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SIMULACROS,
    });

    const Component = await SimulacrosPage();
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: /simulacros/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /\+ nuevo simulacro/i })).not.toBeInTheDocument();

    expect(screen.getByText('Simulacro MIR 2026 - Bloque 1')).toBeInTheDocument();
    expect(screen.getByText('Examen de prueba oficial con 200 preguntas.')).toBeInTheDocument();
    expect(screen.getByText('200 preguntas')).toBeInTheDocument();
    expect(screen.getByText('85.5%')).toBeInTheDocument();

    expect(screen.getByText('Simulacro BIR 2025 - General')).toBeInTheDocument();
    expect(screen.getByText('150 preguntas')).toBeInTheDocument();

    // Ver detalle links
    const detailLinks = screen.getAllByRole('link', { name: /ver detalle/i });
    expect(detailLinks[0]).toHaveAttribute('href', '/simulacros/1');
    expect(detailLinks[1]).toHaveAttribute('href', '/simulacros/2');

    // Imprimir PDF links
    const pdfLinks = screen.getAllByRole('link', { name: /imprimir pdf/i });
    expect(pdfLinks[0]).toHaveAttribute('href', '/simulacros/1/pdf');

    // Attempt buttons:
    // First simulacro has no in-progress attempt -> "Empezar simulacro"
    expect(screen.getByRole('button', { name: /empezar simulacro/i })).toBeInTheDocument();
    // Second simulacro has inProgressAttemptId=42 -> "Continuar intento"
    const continueLink = screen.getByRole('link', { name: /continuar intento/i });
    expect(continueLink).toHaveAttribute('href', '/simulacros/2/attempts/42');
  });

  it('renders "+ Nuevo simulacro" and "Editar" buttons for ADMIN or CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SIMULACROS,
    });

    const Component = await SimulacrosPage();
    render(Component);

    const newBtn = screen.getByRole('link', { name: /\+ nuevo simulacro/i });
    expect(newBtn).toHaveAttribute('href', '/simulacros/new');

    const editLinks = screen.getAllByRole('link', { name: /editar/i });
    expect(editLinks.length).toBe(2);
    expect(editLinks[0]).toHaveAttribute('href', '/simulacros/1/edit');
    expect(editLinks[1]).toHaveAttribute('href', '/simulacros/2/edit');
  });

  it('renders empty alert when no mock exams are available', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const Component = await SimulacrosPage();
    render(Component);

    expect(screen.getByText(/no hay simulacros disponibles para tus bancos de preguntas/i)).toBeInTheDocument();
  });

  it('handles starting a new mock exam attempt', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [MOCK_SIMULACROS[0]],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 99, mockExamId: 1, items: [] }),
      });

    const Component = await SimulacrosPage();
    render(Component);

    const startBtn = screen.getByRole('button', { name: /empezar simulacro/i });
    await user.click(startBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mock-exams/1/attempts'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockPush).toHaveBeenCalledWith('/simulacros/1/attempts/99');
    });
  });
});
