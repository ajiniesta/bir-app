import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulacroResultPage from '@/app/simulacros/[id]/attempts/[attemptId]/result/page';
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

const MOCK_ATTEMPT_RESULT = {
  id: 30,
  mockExamId: 1,
  mockExamTitle: 'Simulacro MIR 2026',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  startedAt: '2026-03-01T10:00:00Z',
  finishedAt: '2026-03-01T11:45:00Z',
  finished: true,
  totalQuestions: 2,
  answeredCount: 1,
  correctCount: 1,
  accuracy: 50.0,
  items: [
    {
      position: 1,
      questionId: 101,
      questionText: '¿Cuál es la causa más común de hematuria macroscópica en varones mayores de 50 años?',
      category: 'Urología',
      tag: 'tumores',
      explanation: 'El carcinoma urotelial de vejiga es la causa más frecuente en ese grupo.',
      answered: true,
      selectedLetter: 'A',
      correct: true,
      correctLetter: 'A',
      options: [
        { letter: 'A', text: 'Carcinoma vesical', correct: true },
        { letter: 'B', text: 'Litiasis renal', correct: false },
      ],
    },
    {
      position: 2,
      questionId: 102,
      questionText: '¿Qué prueba es diagnóstica en miastenia gravis?',
      category: 'Neurología',
      tag: 'autoinmune',
      explanation: 'La prueba de edrofonio o anticuerpos anti-AChR.',
      answered: false,
      selectedLetter: null,
      correct: false,
      correctLetter: 'B',
      options: [
        { letter: 'A', text: 'Punción lumbar', correct: false },
        { letter: 'B', text: 'Anticuerpos anti-receptor de acetilcolina', correct: true },
      ],
    },
  ],
};

const MOCK_MY_PROPOSALS = [
  {
    id: 9,
    questionId: 102,
    proposedLetter: 'A',
    proposedText: null,
    comment: 'La punción lumbar también aporta datos de exclusión.',
    status: 'PENDING',
  },
];

describe('SimulacroResultPage (/simulacros/[id]/attempts/[attemptId]/result)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await SimulacroResultPage({
      params: Promise.resolve({ id: '1', attemptId: '30' }),
    });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders scores summary and review breakdown', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    // 1: GET /api/mock-exam-attempts/30/result
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ATTEMPT_RESULT,
    });
    // 2: GET /api/proposals/mine
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_MY_PROPOSALS,
    });

    const Component = await SimulacroResultPage({
      params: Promise.resolve({ id: '1', attemptId: '30' }),
    });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: 'Simulacro MIR 2026' })).toBeInTheDocument();

    // Summary cards
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(screen.getByText('Acertadas')).toBeInTheDocument();
    expect(screen.getAllByText('En blanco').length).toBeGreaterThanOrEqual(1);

    // Question 1 review (Correcta)
    expect(screen.getByText('¿Cuál es la causa más común de hematuria macroscópica en varones mayores de 50 años?')).toBeInTheDocument();
    expect(screen.getByText('Carcinoma vesical')).toBeInTheDocument();
    expect(screen.getByText('El carcinoma urotelial de vejiga es la causa más frecuente en ese grupo.')).toBeInTheDocument();

    // Question 2 review (En blanco)
    expect(screen.getByText('¿Qué prueba es diagnóstica en miastenia gravis?')).toBeInTheDocument();
    expect(screen.getByText('Anticuerpos anti-receptor de acetilcolina')).toBeInTheDocument();

    // My existing proposal status on question 2
    expect(screen.getByText(/tu propuesta:/i)).toBeInTheDocument();
    expect(screen.getByText(/pendiente/i)).toBeInTheDocument();

    // Navigation buttons
    expect(screen.getByRole('link', { name: /ver historial/i })).toHaveAttribute('href', '/simulacros/1');
    expect(screen.getByRole('link', { name: /todos los simulacros/i })).toHaveAttribute('href', '/simulacros');
    expect(screen.getByRole('button', { name: /repetir simulacro/i })).toBeInTheDocument();
  });

  it('allows submitting an alternative answer proposal on a question', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    // 1: GET /api/mock-exam-attempts/30/result
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ATTEMPT_RESULT,
    });
    // 2: GET /api/proposals/mine
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });
    // 3: POST /api/proposals
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 99, status: 'PENDING' }),
    });

    const Component = await SimulacroResultPage({
      params: Promise.resolve({ id: '1', attemptId: '30' }),
    });
    render(Component);

    // Expand proposal details for Question 1
    const proposalToggles = screen.getAllByText(/proponer respuesta alternativa/i);
    await user.click(proposalToggles[0]);

    const commentInputs = screen.getAllByPlaceholderText(/explica por qué la respuesta es errónea o conflictiva/i);
    await user.type(commentInputs[0], 'Considero que Litiasis renal también debe ser contemplada.');

    const submitButtons = screen.getAllByRole('button', { name: /enviar propuesta/i });
    await user.click(submitButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proposals'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            questionId: 101,
            proposedLetter: null,
            proposedText: null,
            comment: 'Considero que Litiasis renal también debe ser contemplada.',
            source: 'MOCK_EXAM_ATTEMPT',
            sourceId: 30,
            position: 1,
            selectedLetter: 'A',
          }),
        })
      );
      expect(screen.getByText(/propuesta enviada/i)).toBeInTheDocument();
    });
  });
});
