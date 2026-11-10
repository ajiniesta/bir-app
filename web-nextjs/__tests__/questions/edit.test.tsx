import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditQuestionPage from '@/app/questions/[id]/edit/page';
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
  id: 15,
  text: '¿Cuál es el principal catión extracelular?',
  category: 'Fisiología',
  tag: 'electrolitos',
  explanation: 'El sodio es el principal catión del líquido extracelular.',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  answerOptions: [
    { id: 1, letter: 'A', text: 'Potasio', isCorrect: false },
    { id: 2, letter: 'B', text: 'Sodio', isCorrect: true },
    { id: 3, letter: 'C', text: 'Calcio', isCorrect: false },
    { id: 4, letter: 'D', text: 'Magnesio', isCorrect: false },
  ],
};

const MOCK_EXAM_TYPES = [
  { id: 1, code: 'BIR', name: 'Biólogo Interno Residente' },
  { id: 2, code: 'MIR', name: 'Médico Interno Residente' },
];

const MOCK_TAGS = ['electrolitos', 'farmacos'];

describe('EditQuestionPage (/questions/[id]/edit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await EditQuestionPage({ params: Promise.resolve({ id: '15' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await EditQuestionPage({ params: Promise.resolve({ id: '15' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('pre-populates form with question data and updates question via PUT', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_QUESTION,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TAGS,
      });

    const Component = await EditQuestionPage({ params: Promise.resolve({ id: '15' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /editar pregunta/i })).toBeInTheDocument();

    const textInput = screen.getByLabelText(/texto de la pregunta/i);
    expect(textInput).toHaveValue('¿Cuál es el principal catión extracelular?');

    const categoryInput = screen.getByLabelText(/categoría/i);
    expect(categoryInput).toHaveValue('Fisiología');

    const tagInput = screen.getByLabelText(/tag/i);
    expect(tagInput).toHaveValue('electrolitos');

    const explanationInput = screen.getByLabelText(/explicación/i);
    expect(explanationInput).toHaveValue('El sodio es el principal catión del líquido extracelular.');

    // Check option B is checked as correct
    const radios = screen.getAllByRole('radio', { name: /correcta/i });
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();

    // Modify explanation
    await user.clear(explanationInput);
    await user.type(explanationInput, 'Explicación actualizada sobre el sodio.');

    // Submit PUT
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_QUESTION, explanation: 'Explicación actualizada sobre el sodio.' }),
    });

    const saveBtn = screen.getByRole('button', { name: /guardar cambios/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/questions/15'),
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-admin',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            text: '¿Cuál es el principal catión extracelular?',
            category: 'Fisiología',
            tag: 'electrolitos',
            explanation: 'Explicación actualizada sobre el sodio.',
            examTypeId: 2,
            answerOptions: [
              { letter: 'A', text: 'Potasio', isCorrect: false },
              { letter: 'B', text: 'Sodio', isCorrect: true },
              { letter: 'C', text: 'Calcio', isCorrect: false },
              { letter: 'D', text: 'Magnesio', isCorrect: false },
            ],
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/questions');
    });
  });

  it('renders not found when question to edit does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const Component = await EditQuestionPage({ params: Promise.resolve({ id: '999' }) });
    render(Component);

    expect(screen.getByText(/pregunta no encontrada/i)).toBeInTheDocument();
  });
});
