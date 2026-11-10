import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateQuestionPage from '@/app/questions/create/page';
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

const MOCK_TAGS = ['enzimas', 'farmacos'];

describe('CreateQuestionPage (/questions/create)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await CreateQuestionPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await CreateQuestionPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('renders create question form with fields and submits valid question', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'creator', role: 'CREATOR', roles: ['ROLE_CREATOR'], accessToken: 'token-creator' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TAGS,
      });

    const Component = await CreateQuestionPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /nueva pregunta/i })).toBeInTheDocument();

    // Verify fields
    const examSelect = screen.getByLabelText(/tipo de examen/i);
    const categoryInput = screen.getByLabelText(/categoría/i);
    const tagInput = screen.getByLabelText(/tag/i);
    const textInput = screen.getByLabelText(/texto de la pregunta/i);
    const explanationInput = screen.getByLabelText(/explicación/i);

    expect(examSelect).toBeInTheDocument();
    expect(categoryInput).toBeInTheDocument();
    expect(tagInput).toBeInTheDocument();
    expect(textInput).toBeInTheDocument();
    expect(explanationInput).toBeInTheDocument();

    // Fill form
    await user.selectOptions(examSelect, '1');
    await user.type(categoryInput, 'Genética');
    await user.type(tagInput, 'enzimas');
    await user.type(textInput, '¿Qué enzima realiza la transcripción?');
    await user.type(explanationInput, 'La ARN polimerasa es la encargada.');

    // Fill options A, B, C, D
    const optionInputs = screen.getAllByPlaceholderText(/texto de la opción/i);
    expect(optionInputs.length).toBe(4);

    await user.type(optionInputs[0], 'ADN polimerasa');
    await user.type(optionInputs[1], 'ARN polimerasa');
    await user.type(optionInputs[2], 'Helicasa');
    await user.type(optionInputs[3], 'Ligasa');

    // Select B as correct
    const correctRadios = screen.getAllByRole('radio', { name: /correcta/i });
    expect(correctRadios.length).toBe(4);
    await user.click(correctRadios[1]); // B

    // Submit
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 99, text: '¿Qué enzima realiza la transcripción?' }),
    });

    const submitBtn = screen.getByRole('button', { name: /crear pregunta/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/questions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-creator',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            text: '¿Qué enzima realiza la transcripción?',
            category: 'Genética',
            tag: 'enzimas',
            explanation: 'La ARN polimerasa es la encargada.',
            examTypeId: 1,
            answerOptions: [
              { letter: 'A', text: 'ADN polimerasa', isCorrect: false },
              { letter: 'B', text: 'ARN polimerasa', isCorrect: true },
              { letter: 'C', text: 'Helicasa', isCorrect: false },
              { letter: 'D', text: 'Ligasa', isCorrect: false },
            ],
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/questions');
    });
  });

  it('shows error message if question creation fails on API', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await CreateQuestionPage();
    render(Component);

    await user.selectOptions(screen.getByLabelText(/tipo de examen/i), '2');
    await user.type(screen.getByLabelText(/texto de la pregunta/i), 'Pregunta de prueba');
    const optionInputs = screen.getAllByPlaceholderText(/texto de la opción/i);
    await user.type(optionInputs[0], 'Opt A');
    await user.type(optionInputs[1], 'Opt B');
    await user.type(optionInputs[2], 'Opt C');
    await user.type(optionInputs[3], 'Opt D');

    const correctRadios = screen.getAllByRole('radio', { name: /correcta/i });
    await user.click(correctRadios[0]);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error al crear la pregunta' }),
    });

    await user.click(screen.getByRole('button', { name: /crear pregunta/i }));

    await waitFor(() => {
      expect(screen.getByText(/error al crear la pregunta/i)).toBeInTheDocument();
    });
  });
});
