import { render, screen } from '@testing-library/react';
import DoubtQuestionDetailPage from '@/app/dudas/[id]/page';
import { auth } from '@/auth';

const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
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

const MOCK_DOUBT_DETAIL = {
  id: 11,
  text: '¿Cuál es el mecanismo de acción de los betalactámicos?',
  category: 'Farmacología',
  tag: 'antibioticos, pared',
  tags: ['antibioticos', 'pared'],
  explanation: 'Inhiben la síntesis de peptidoglicano de la pared celular bacteriana.',
  examTypeId: 1,
  examTypeCode: 'BIR',
  answerOptions: [
    { id: 101, letter: 'A', text: 'Inhibición de la síntesis de la pared celular', isCorrect: true },
    { id: 102, letter: 'B', text: 'Inhibición de la subunidad 30S ribosomal', isCorrect: false },
  ],
};

describe('DoubtQuestionDetailPage (/dudas/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await DoubtQuestionDetailPage({ params: Promise.resolve({ id: '11' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders question detail with correct option highlighted and explanation for an authenticated USER', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'student',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'token-user',
      },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => MOCK_DOUBT_DETAIL,
    });

    const Component = await DoubtQuestionDetailPage({ params: Promise.resolve({ id: '11' }) });
    render(Component);

    expect(screen.getByText('¿Cuál es el mecanismo de acción de los betalactámicos?')).toBeInTheDocument();
    expect(screen.getByText('Farmacología')).toBeInTheDocument();
    expect(screen.getByText('#antibioticos')).toBeInTheDocument();
    expect(screen.getByText('Inhibición de la síntesis de la pared celular')).toBeInTheDocument();
    expect(screen.getByText('Correcta')).toBeInTheDocument();
    expect(
      screen.getByText('Inhiben la síntesis de peptidoglicano de la pared celular bacteriana.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a preguntas en duda/i })).toHaveAttribute(
      'href',
      '/dudas'
    );
  });
});
