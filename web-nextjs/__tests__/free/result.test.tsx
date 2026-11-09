import { render, screen } from '@testing-library/react';
import FreeResultPage from '@/app/free/[id]/result/page';
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

const MOCK_SESSION_RESULT = {
  id: 77,
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  category: 'Cardiología',
  tag: 'arritmias',
  totalQuestions: 2,
  answeredCount: 2,
  correctCount: 1,
  finished: true,
  items: [
    {
      position: 1,
      questionId: 101,
      questionText: '¿Cuál es el tratamiento de primera línea en fibrilación auricular rápida?',
      category: 'Cardiología',
      tag: 'arritmias',
      explanation: 'Los betabloqueantes o calcioantagonistas son primera línea para control de frecuencia.',
      options: [
        { letter: 'A', text: 'Betabloqueantes' },
        { letter: 'B', text: 'Atropina' },
      ],
      answered: true,
      selectedLetter: 'A',
      correct: true,
      correctLetter: 'A',
    },
    {
      position: 2,
      questionId: 102,
      questionText: '¿Qué onda del ECG representa la repolarización ventricular?',
      category: 'Cardiología',
      tag: 'electrocardiograma',
      explanation: 'La onda T representa la repolarización ventricular.',
      options: [
        { letter: 'A', text: 'Onda P' },
        { letter: 'B', text: 'Onda T' },
      ],
      answered: true,
      selectedLetter: 'A',
      correct: false,
      correctLetter: 'B',
    },
  ],
};

describe('FreeResultPage (/free/[id]/result)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await FreeResultPage({ params: Promise.resolve({ id: '77' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders summary statistics (total questions, correct count, percentage) and question list', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SESSION_RESULT,
    });

    const Component = await FreeResultPage({ params: Promise.resolve({ id: '77' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /resultado de la partida/i })).toBeInTheDocument();

    // Summary counters
    expect(screen.getByText('Preguntas')).toBeInTheDocument();
    expect(screen.getByText('Acertadas')).toBeInTheDocument();
    expect(screen.getByText('Acierto')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Metadata
    expect(screen.getByText(/Médico Interno Residente/i)).toBeInTheDocument();
    expect(screen.getByText(/Cardiología/i)).toBeInTheDocument();
    expect(screen.getAllByText(/arritmias/i).length).toBeGreaterThanOrEqual(1);

    // Items
    expect(
      screen.getByText(/¿Cuál es el tratamiento de primera línea en fibrilación auricular rápida\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Correcta')).toBeInTheDocument();
    expect(screen.getByText('Incorrecta')).toBeInTheDocument();
    expect(
      screen.getAllByText((_, el) =>
        el?.textContent?.replace(/\s+/g, ' ').includes('Tu respuesta: A · Correcta: B') ?? false
      ).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Los betabloqueantes o calcioantagonistas son primera línea/i)
    ).toBeInTheDocument();

    // Action links
    expect(screen.getByRole('link', { name: /nueva partida/i })).toHaveAttribute('href', '/free');
    expect(screen.getByRole('link', { name: /volver al panel/i })).toHaveAttribute('href', '/');
  });

  it('renders not found alert when session does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const Component = await FreeResultPage({ params: Promise.resolve({ id: '999' }) });
    render(Component);

    expect(screen.getByText(/partida no encontrada/i)).toBeInTheDocument();
  });
});
