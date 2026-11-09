import { render, screen } from '@testing-library/react';
import QuestionDetailPage from '@/app/questions/[id]/page';
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

const MOCK_QUESTION = {
  id: 42,
  text: '¿Cuál es el principal neurotransmisor inhibitorio del SNC?',
  category: 'Neurobiología',
  tag: 'neurotransmisores',
  explanation: 'El GABA es el principal neurotransmisor inhibitorio en el cerebro.',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  answerOptions: [
    { id: 101, letter: 'A', text: 'Glutamato', isCorrect: false },
    { id: 102, letter: 'B', text: 'GABA', isCorrect: true },
    { id: 103, letter: 'C', text: 'Dopamina', isCorrect: false },
    { id: 104, letter: 'D', text: 'Acetilcolina', isCorrect: false },
  ],
  createdAt: '2026-01-01T10:00:00',
  updatedAt: '2026-01-02T12:00:00',
};

describe('QuestionDetailPage (/questions/[id])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await QuestionDetailPage({ params: Promise.resolve({ id: '42' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await QuestionDetailPage({ params: Promise.resolve({ id: '42' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('renders question details, explanation, and answer options highlighting the correct one', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_QUESTION,
    });

    const Component = await QuestionDetailPage({ params: Promise.resolve({ id: '42' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /pregunta #42/i })).toBeInTheDocument();
    expect(screen.getByText('¿Cuál es el principal neurotransmisor inhibitorio del SNC?')).toBeInTheDocument();
    expect(screen.getByText('MIR')).toBeInTheDocument();
    expect(screen.getByText('Neurobiología')).toBeInTheDocument();
    expect(screen.getByText('#neurotransmisores')).toBeInTheDocument();

    // Explanation
    expect(screen.getByText(/el gaba es el principal neurotransmisor inhibitorio/i)).toBeInTheDocument();

    // Options
    expect(screen.getByText('Glutamato')).toBeInTheDocument();
    expect(screen.getByText('GABA')).toBeInTheDocument();
    expect(screen.getByText('Correcta')).toBeInTheDocument();

    // Links
    expect(screen.getByRole('link', { name: /editar/i })).toHaveAttribute('href', '/questions/42/edit');
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute('href', '/questions');

    // Timestamps
    expect(screen.getByText(/creado:/i)).toBeInTheDocument();
    expect(screen.getByText(/modificado:/i)).toBeInTheDocument();
  });

  it('renders not found alert when question does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const Component = await QuestionDetailPage({ params: Promise.resolve({ id: '999' }) });
    render(Component);

    expect(screen.getByText(/pregunta no encontrada/i)).toBeInTheDocument();
  });
});
