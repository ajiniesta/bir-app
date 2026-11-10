import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionImportPage from '@/app/questions/import/page';
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

const SAMPLE_QUESTION_JSON = JSON.stringify({
  exam_type: "3",
  category: "Fisiología",
  tag: "Tema 1",
  text: "Esta es la pregunta",
  explanation: "Esta es la explicación",
  answers: [
    { letter: "A", text: "respuesta 1", is_correct: true },
    { letter: "B", text: "respuesta 2", is_correct: false },
    { letter: "C", text: "respuesta 3", is_correct: false },
    { letter: "D", text: "respuesta 4", is_correct: false },
  ],
});

describe('QuestionImportPage (/questions/import)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await QuestionImportPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await QuestionImportPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('renders import form and sample JSON format for ADMIN/CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    const Component = await QuestionImportPage();
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: /importar preguntas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/fichero de preguntas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /importar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute('href', '/questions');

    // Sample format display
    expect(screen.getByText(/formato del fichero/i)).toBeInTheDocument();
    expect(screen.getByText(/"exam_type": "3"/i)).toBeInTheDocument();
    expect(screen.getByText(/"category": "Fisiología"/i)).toBeInTheDocument();
    expect(screen.getByText(/"text": "Esta es la pregunta"/i)).toBeInTheDocument();
  });

  it('rejects files larger than 10 MB with an error message', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'creator_user', role: 'CREATOR', roles: ['ROLE_CREATOR'], accessToken: 'token-creator' },
    });

    const Component = await QuestionImportPage();
    render(Component);

    const oversizedFile = new File(['a'], 'giant.json', { type: 'application/json' });
    Object.defineProperty(oversizedFile, 'size', { value: 11 * 1024 * 1024 }); // 11 MB

    const fileInput = screen.getByLabelText(/fichero de preguntas/i);
    await user.upload(fileInput, oversizedFile);

    const submitBtn = screen.getByRole('button', { name: /importar/i });
    await user.click(submitBtn);

    expect(screen.getByText(/el fichero no puede superar los 10 mb/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('uploads valid JSON file in batches, displays progress and final results', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 1,
        imported: 1,
        skipped: 0,
        duplicates: 0,
        errors: [],
      }),
    });

    const Component = await QuestionImportPage();
    render(Component);

    const validFile = new File([SAMPLE_QUESTION_JSON], 'preguntas.json', { type: 'application/json' });
    const fileInput = screen.getByLabelText(/fichero de preguntas/i);
    await user.upload(fileInput, validFile);

    const submitBtn = screen.getByRole('button', { name: /importar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/questions/import'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"content"'),
        })
      );
    });

    // Verification of progress and final results
    await waitFor(() => {
      expect(screen.getAllByText(/importación terminada/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/1 importada/i)).toBeInTheDocument();
    });
  });

  it('displays skipped questions and duplicate counts upon completion', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total: 2,
        imported: 0,
        skipped: 1,
        duplicates: 1,
        errors: ['Pregunta 1: Enunciado inválido'],
      }),
    });

    const Component = await QuestionImportPage();
    render(Component);

    const content = `[${SAMPLE_QUESTION_JSON}, ${SAMPLE_QUESTION_JSON}]`;
    const file = new File([content], 'preguntas.json', { type: 'application/json' });
    const fileInput = screen.getByLabelText(/fichero de preguntas/i);
    await user.upload(fileInput, file);

    const submitBtn = screen.getByRole('button', { name: /importar/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/1 ya existente/i)).toBeInTheDocument();
      expect(screen.getByText(/1 con errores/i)).toBeInTheDocument();
      expect(screen.getByText(/Pregunta 1: Enunciado inválido/i)).toBeInTheDocument();
    });
  });
});
