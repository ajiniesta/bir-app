import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulacroDetailPage from '@/app/simulacros/[id]/page';
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

const MOCK_DETAIL = {
  id: 1,
  title: 'Simulacro MIR 2026 - Cardio y Neumo',
  description: 'Simulacro completo para preparación de la convocatoria.',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  questionCount: 2,
  questions: [
    {
      position: 1,
      questionId: 101,
      text: '¿Cuál es el síntoma principal de la estenosis aórtica severa?',
      category: 'Cardiología',
      tag: 'valvulopatias',
      explanation: 'La tríada clásica es angina, síncope y disnea.',
      options: [
        { letter: 'A', text: 'Disnea de esfuerzo' },
        { letter: 'B', text: 'Cianosis periférica' },
      ],
    },
    {
      position: 2,
      questionId: 102,
      text: '¿Qué patrón espirométrico caracteriza al asma?',
      category: 'Neumología',
      tag: 'obstructiva',
      explanation: 'Patrón obstructivo reversible con broncodilatador.',
      options: [
        { letter: 'A', text: 'Obstructivo reversible' },
        { letter: 'B', text: 'Restrictivo puro' },
      ],
    },
  ],
};

const MOCK_ATTEMPTS = [
  {
    id: 11,
    mockExamId: 1,
    startedAt: '2026-03-01T10:00:00Z',
    finishedAt: '2026-03-01T11:30:00Z',
    finished: true,
    totalQuestions: 2,
    answeredCount: 2,
    correctCount: 2,
    accuracy: 100.0,
  },
  {
    id: 12,
    mockExamId: 1,
    startedAt: '2026-03-02T15:00:00Z',
    finishedAt: null,
    finished: false,
    totalQuestions: 2,
    answeredCount: 1,
    correctCount: 0,
    accuracy: 0.0,
  },
];

describe('SimulacroDetailPage (/simulacros/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await SimulacroDetailPage({ params: Promise.resolve({ id: '1' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders detail view with questions and attempt history', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'regular_user', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    // Mock GET /api/mock-exams/1
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DETAIL,
    });
    // Mock GET /api/mock-exams/1/attempts
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ATTEMPTS,
    });

    const Component = await SimulacroDetailPage({ params: Promise.resolve({ id: '1' }) });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: 'Simulacro MIR 2026 - Cardio y Neumo' })).toBeInTheDocument();
    expect(screen.getByText('Simulacro completo para preparación de la convocatoria.')).toBeInTheDocument();
    expect(screen.getByText('MIR')).toBeInTheDocument();

    // Questions list
    expect(screen.getByText('¿Cuál es el síntoma principal de la estenosis aórtica severa?')).toBeInTheDocument();
    expect(screen.getByText('Cardiología')).toBeInTheDocument();
    expect(screen.getByText('#valvulopatias')).toBeInTheDocument();
    expect(screen.getByText('¿Qué patrón espirométrico caracteriza al asma?')).toBeInTheDocument();

    // Attempt history table
    expect(screen.getByText('Entregado')).toBeInTheDocument();
    expect(screen.getByText('En curso')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();

    const viewResultLink = screen.getByRole('link', { name: /ver resultado/i });
    expect(viewResultLink).toHaveAttribute('href', '/simulacros/1/attempts/11/result');

    const continueLink = screen.getAllByRole('link', { name: /continuar/i });
    expect(continueLink.some((l) => l.getAttribute('href') === '/simulacros/1/attempts/12')).toBe(true);

    // Regular user should not see Editar or Eliminar
    expect(screen.queryByRole('link', { name: /editar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument();
  });

  it('allows ADMIN to edit and delete the mock exam', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_DETAIL,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

    const Component = await SimulacroDetailPage({ params: Promise.resolve({ id: '1' }) });
    render(Component);

    const editBtn = screen.getByRole('link', { name: /editar/i });
    expect(editBtn).toHaveAttribute('href', '/simulacros/1/edit');

    const deleteBtn = screen.getByRole('button', { name: /eliminar/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mock-exams/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(mockPush).toHaveBeenCalledWith('/simulacros');
    });
  });

  it('renders alert when no attempts exist yet', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_DETAIL,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

    const Component = await SimulacroDetailPage({ params: Promise.resolve({ id: '1' }) });
    render(Component);

    expect(screen.getByText(/todavía no has resuelto este simulacro/i)).toBeInTheDocument();
  });
});
