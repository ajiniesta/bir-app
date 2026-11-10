import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreeConfigPage from '@/app/free/page';
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

const MOCK_EXAM_TYPES = [
  { id: 1, code: 'BIR', name: 'Biólogo Interno Residente' },
  { id: 2, code: 'MIR', name: 'Médico Interno Residente' },
];

const MOCK_CATEGORIES = ['Farmacología', 'Bioquímica'];
const MOCK_TAGS = ['antibioticos', 'enzimas'];

describe('FreeConfigPage (/free)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await FreeConfigPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders config form with exam types, categories, and tags for authenticated users', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_CATEGORIES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await FreeConfigPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /modo libre/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de examen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categoría/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tag/i)).toBeInTheDocument();
    const countInput = screen.getByLabelText(/número de preguntas/i);
    expect(countInput).toBeInTheDocument();
    expect(countInput).toHaveValue(10);
    expect(screen.getByRole('button', { name: /empezar partida/i })).toBeInTheDocument();
  });

  it('shows notice when user has no exam types available', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const Component = await FreeConfigPage();
    render(Component);

    expect(
      screen.getByText(/no tienes ningún banco de preguntas disponible/i)
    ).toBeInTheDocument();
  });

  it('validates count field before submitting (rejects count < 1 or count > 100)', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_CATEGORIES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await FreeConfigPage();
    render(Component);

    const countInput = screen.getByLabelText(/número de preguntas/i);
    const submitBtn = screen.getByRole('button', { name: /empezar partida/i });

    // Try count = 0
    await user.clear(countInput);
    await user.type(countInput, '0');
    await user.click(submitBtn);

    expect(
      screen.getByText(/el número de preguntas debe estar entre 1 y 100/i)
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3); // only initial 3 fetches, no POST

    // Try count = 150
    await user.clear(countInput);
    await user.type(countInput, '150');
    await user.click(submitBtn);

    expect(
      screen.getByText(/el número de preguntas debe estar entre 1 y 100/i)
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('submits valid configuration and redirects to the free session', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_CATEGORIES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await FreeConfigPage();
    render(Component);

    await user.selectOptions(screen.getByLabelText(/tipo de examen/i), 'BIR');
    await user.selectOptions(screen.getByLabelText(/categoría/i), 'Farmacología');
    await user.selectOptions(screen.getByLabelText(/tag/i), 'antibioticos');

    const countInput = screen.getByLabelText(/número de preguntas/i);
    await user.clear(countInput);
    await user.type(countInput, '20');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 55, totalQuestions: 20 }),
    });

    await user.click(screen.getByRole('button', { name: /empezar partida/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/free-sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-user',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            examTypeCode: 'BIR',
            category: 'Farmacología',
            tag: 'antibioticos',
            count: 20,
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/free/55');
    });
  });

  it('displays error message when session creation fails', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_CATEGORIES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await FreeConfigPage();
    render(Component);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No hay preguntas disponibles con esos filtros' }),
    });

    await user.click(screen.getByRole('button', { name: /empezar partida/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/no hay preguntas disponibles con esos filtros/i)
      ).toBeInTheDocument();
    });
  });
});
