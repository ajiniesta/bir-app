import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreePlayPage from '@/app/free/[id]/page';
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

const MOCK_SESSION_ACTIVE = {
  id: 88,
  examTypeCode: 'BIR',
  examTypeName: 'Biólogo Interno Residente',
  category: 'Bioquímica',
  tag: 'enzimas',
  totalQuestions: 2,
  answeredCount: 0,
  correctCount: 0,
  finished: false,
  items: [
    {
      position: 1,
      questionId: 201,
      questionText: '¿Cuál es la constante de Michaelis-Menten?',
      category: 'Bioquímica',
      tag: 'enzimas',
      explanation: 'Km es la concentración de sustrato a la mitad de Vmax.',
      options: [
        { letter: 'A', text: 'Km' },
        { letter: 'B', text: 'Vmax' },
      ],
      answered: false,
      selectedLetter: null,
      correct: null,
      correctLetter: null,
    },
    {
      position: 2,
      questionId: 202,
      questionText: '¿Qué tipo de inhibidor se une al sitio alostérico?',
      category: 'Bioquímica',
      tag: 'enzimas',
      explanation: 'Los inhibidores no competitivos suelen unirse a sitios alostéricos.',
      options: [
        { letter: 'A', text: 'Competitivo' },
        { letter: 'B', text: 'No competitivo' },
      ],
      answered: false,
      selectedLetter: null,
      correct: null,
      correctLetter: null,
    },
  ],
};

const MOCK_ANSWERED_ITEM_1 = {
  ...MOCK_SESSION_ACTIVE,
  answeredCount: 1,
  correctCount: 1,
  items: [
    {
      ...MOCK_SESSION_ACTIVE.items[0],
      answered: true,
      selectedLetter: 'A',
      correct: true,
      correctLetter: 'A',
    },
    MOCK_SESSION_ACTIVE.items[1],
  ],
};

describe('FreePlayPage (/free/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await FreePlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /free/[id]/result if the session is already finished', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_SESSION_ACTIVE, finished: true }),
    });

    const Component = await FreePlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/free/88/result');
  });

  it('renders current question, answers it, shows feedback, and opens Proposal modal', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_SESSION_ACTIVE,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [], // no previous proposals
      });

    const Component = await FreePlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    // Initial state: question 1
    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Acertadas: 0 / 0')).toBeInTheDocument();
    expect(screen.getByText('¿Cuál es la constante de Michaelis-Menten?')).toBeInTheDocument();

    const radioA = screen.getByRole('radio', { name: /km/i });
    await user.click(radioA);

    // Submit answer
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ANSWERED_ITEM_1,
    });

    const answerBtn = screen.getByRole('button', { name: /responder/i });
    await user.click(answerBtn);

    // Feedback view
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/free-sessions/88/answers'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-user',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ position: 1, letter: 'A' }),
        })
      );
    });

    expect(screen.getByText('¡Correcto!')).toBeInTheDocument();
    expect(screen.getByText('Correcta')).toBeInTheDocument();
    expect(screen.getByText(/km es la concentración de sustrato a la mitad de vmax/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /siguiente pregunta/i })).toBeInTheDocument();

    // Open Proposal modal
    const proposeBtn = screen.getByRole('button', { name: /proponer cambio/i });
    await user.click(proposeBtn);

    expect(screen.getByRole('heading', { name: /proponer respuesta alternativa/i })).toBeInTheDocument();

    const commentInput = screen.getByLabelText(/motivo/i);
    await user.type(commentInput, 'Creo que la pregunta es ambigua.');

    // Submit proposal
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 1,
        questionId: 201,
        status: 'PENDING',
        comment: 'Creo que la pregunta es ambigua.',
      }),
    });

    const submitProposalBtn = screen.getByRole('button', { name: /enviar propuesta/i });
    await user.click(submitProposalBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proposals'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-user',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            questionId: 201,
            proposedLetter: null,
            proposedText: null,
            comment: 'Creo que la pregunta es ambigua.',
            source: 'FREE_SESSION',
            sourceId: 88,
            position: 1,
            selectedLetter: 'A',
          }),
        })
      );
      expect(
        screen.getByText(/propuesta enviada\. gracias, un revisor la valorará\./i)
      ).toBeInTheDocument();
    });

    // Advance to next question
    const nextBtn = screen.getByRole('button', { name: /siguiente pregunta/i });
    await user.click(nextBtn);

    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('¿Qué tipo de inhibidor se une al sitio alostérico?')).toBeInTheDocument();
  });
});
