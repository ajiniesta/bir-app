import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SimulacroAttemptPage from '@/app/simulacros/[id]/attempts/[attemptId]/page';
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

const MOCK_IN_PROGRESS_ATTEMPT = {
  id: 25,
  mockExamId: 1,
  mockExamTitle: 'Simulacro MIR 2026',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  startedAt: '2026-03-01T10:00:00Z',
  finishedAt: null,
  finished: false,
  totalQuestions: 2,
  answeredCount: 0,
  correctCount: 0,
  accuracy: 0.0,
  items: [
    {
      position: 1,
      questionId: 101,
      questionText: '¿Cuál es el antiarrítmico de elección en taquicardia supraventricular por reentrada nodal?',
      category: 'Cardiología',
      tag: 'farmacos',
      explanation: null,
      answered: false,
      selectedLetter: null,
      correct: null,
      correctLetter: null,
      options: [
        { letter: 'A', text: 'Adenosina intravenosa' },
        { letter: 'B', text: 'Digoxina' },
      ],
    },
    {
      position: 2,
      questionId: 102,
      questionText: '¿Qué célula produce surfactante pulmonar?',
      category: 'Neumología',
      tag: 'histologia',
      explanation: null,
      answered: false,
      selectedLetter: null,
      correct: null,
      correctLetter: null,
      options: [
        { letter: 'A', text: 'Neumocito tipo II' },
        { letter: 'B', text: 'Macrófago alveolar' },
      ],
    },
  ],
};

const MOCK_FINISHED_ATTEMPT = {
  ...MOCK_IN_PROGRESS_ATTEMPT,
  finished: true,
  finishedAt: '2026-03-01T11:00:00Z',
};

describe('SimulacroAttemptPage (/simulacros/[id]/attempts/[attemptId])', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await SimulacroAttemptPage({
      params: Promise.resolve({ id: '1', attemptId: '25' }),
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('redirects to result page if attempt is already finished', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_FINISHED_ATTEMPT,
    });

    const Component = await SimulacroAttemptPage({
      params: Promise.resolve({ id: '1', attemptId: '25' }),
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/simulacros/1/attempts/25/result');
  });

  it('renders current question, radio options, and handles saving answer', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_IN_PROGRESS_ATTEMPT,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...MOCK_IN_PROGRESS_ATTEMPT,
          answeredCount: 1,
          items: [
            {
              ...MOCK_IN_PROGRESS_ATTEMPT.items[0],
              answered: true,
              selectedLetter: 'A',
            },
            MOCK_IN_PROGRESS_ATTEMPT.items[1],
          ],
        }),
      });

    const Component = await SimulacroAttemptPage({
      params: Promise.resolve({ id: '1', attemptId: '25' }),
      searchParams: Promise.resolve({ position: '1' }),
    });
    render(Component);

    expect(screen.getByText('Pregunta 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('¿Cuál es el antiarrítmico de elección en taquicardia supraventricular por reentrada nodal?')).toBeInTheDocument();
    expect(screen.getByText('Adenosina intravenosa')).toBeInTheDocument();
    expect(screen.getByText('Digoxina')).toBeInTheDocument();

    // Select option A
    const radioA = screen.getByRole('radio', { name: /a adenosina intravenosa/i });
    await user.click(radioA);
    expect(radioA).toBeChecked();

    // Click "Guardar respuesta"
    const saveBtn = screen.getByRole('button', { name: /guardar respuesta/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mock-exam-attempts/25/answers'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ position: 1, letter: 'A' }),
        })
      );
      expect(screen.getByText(/respuesta guardada/i)).toBeInTheDocument();
    });
  });

  it('navigates to another question via question navigator', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_IN_PROGRESS_ATTEMPT,
    });

    const Component = await SimulacroAttemptPage({
      params: Promise.resolve({ id: '1', attemptId: '25' }),
      searchParams: Promise.resolve({ position: '1' }),
    });
    render(Component);

    // Click position button '2' in navigator
    const navButtons = screen.getAllByRole('button', { name: /^[12]$/ });
    await user.click(navButtons[1]); // Question 2

    expect(screen.getByText('Pregunta 2 de 2')).toBeInTheDocument();
    expect(screen.getByText('¿Qué célula produce surfactante pulmonar?')).toBeInTheDocument();
  });

  it('submits and finishes the mock exam attempt', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_IN_PROGRESS_ATTEMPT,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_FINISHED_ATTEMPT,
      });

    const Component = await SimulacroAttemptPage({
      params: Promise.resolve({ id: '1', attemptId: '25' }),
      searchParams: Promise.resolve({ position: '1' }),
    });
    render(Component);

    const finishBtn = screen.getByRole('button', { name: /entregar simulacro/i });
    await user.click(finishBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/mock-exam-attempts/25/finish'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(mockPush).toHaveBeenCalledWith('/simulacros/1/attempts/25/result');
    });
  });
});
