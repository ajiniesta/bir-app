import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepasoPlayPage from '@/app/repaso/[id]/page';
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

const MOCK_REVIEW_SESSION_ACTIVE = {
  id: 88,
  examTypeCode: 'BIR',
  examTypeName: 'Biólogo Interno Residente',
  categories: ['Bioquímica'],
  tags: ['enzimas'],
  totalMatchingQuestions: 5,
  answeredCount: 0,
  correctCount: 0,
  accuracy: 0,
  hasMoreQuestions: true,
  finished: false,
  byCategory: [],
  items: [
    {
      position: 1,
      questionId: 201,
      questionText: '¿Cuál es la constante de Michaelis-Menten?',
      category: 'Bioquímica',
      tag: 'enzimas',
      tags: ['enzimas'],
      explanation: null,
      options: [
        { letter: 'A', text: 'Km' },
        { letter: 'B', text: 'Vmax' },
      ],
      answered: false,
      selectedLetter: null,
      correct: null,
      correctLetter: null,
    },
  ],
};

const MOCK_REVIEW_AFTER_ANSWER_1 = {
  ...MOCK_REVIEW_SESSION_ACTIVE,
  answeredCount: 1,
  correctCount: 1,
  accuracy: 100,
  hasMoreQuestions: true,
  byCategory: [
    {
      category: 'Bioquímica',
      answered: 1,
      correct: 1,
      accuracy: 100,
    },
  ],
  items: [
    {
      ...MOCK_REVIEW_SESSION_ACTIVE.items[0],
      answered: true,
      selectedLetter: 'A',
      correct: true,
      correctLetter: 'A',
      explanation: 'Km es la concentración de sustrato a la mitad de Vmax.',
    },
    {
      position: 2,
      questionId: 202,
      questionText: '¿Qué tipo de inhibidor se une al sitio alostérico?',
      category: 'Bioquímica',
      tag: 'enzimas',
      tags: ['enzimas'],
      explanation: null,
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

describe('RepasoPlayPage (/repaso/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await RepasoPlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to /repaso/[id]/result if the review session is already finished', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_REVIEW_SESSION_ACTIVE, finished: true }),
    });

    const Component = await RepasoPlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/repaso/88/result');
  });

  it('renders current question, submits answer, shows feedback and explanation, and advances to next question', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() ?? 'GET';

      if (url.includes('/api/review-sessions/88/answers') && method === 'POST') {
        return { ok: true, status: 200, json: async () => MOCK_REVIEW_AFTER_ANSWER_1 };
      }
      if (url.includes('/api/review-sessions/88') && method === 'GET') {
        return { ok: true, status: 200, json: async () => MOCK_REVIEW_SESSION_ACTIVE };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const Component = await RepasoPlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    expect(screen.getByText('¿Cuál es la constante de Michaelis-Menten?')).toBeInTheDocument();

    const radioA = screen.getByRole('radio', { name: /km/i });
    await user.click(radioA);

    const answerBtn = screen.getByRole('button', { name: /responder/i });
    await user.click(answerBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review-sessions/88/answers'),
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
    expect(
      screen.getByText(/km es la concentración de sustrato a la mitad de vmax/i)
    ).toBeInTheDocument();

    const nextBtn = screen.getByRole('button', { name: /siguiente pregunta/i });
    await user.click(nextBtn);

    expect(
      screen.getByText('¿Qué tipo de inhibidor se une al sitio alostérico?')
    ).toBeInTheDocument();
  });

  it('allows finishing the review session at any time and redirects to /repaso/[id]/result', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method?.toUpperCase() ?? 'GET';

      if (url.includes('/api/review-sessions/88/finish') && method === 'POST') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...MOCK_REVIEW_AFTER_ANSWER_1, finished: true, hasMoreQuestions: false }),
        };
      }
      if (url.includes('/api/review-sessions/88') && method === 'GET') {
        return { ok: true, status: 200, json: async () => MOCK_REVIEW_SESSION_ACTIVE };
      }
      return { ok: true, status: 200, json: async () => [] };
    });

    const Component = await RepasoPlayPage({ params: Promise.resolve({ id: '88' }) });
    render(Component);

    const finishBtn = screen.getAllByRole('button', { name: /finalizar repaso/i })[0];
    await user.click(finishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review-sessions/88/finish'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-user',
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/repaso/88/result');
    });
  });
});
