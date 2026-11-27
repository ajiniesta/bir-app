import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepasoConfigPage from '@/app/repaso/page';
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

const MOCK_FILTERS = {
  categories: ['Farmacología', 'Bioquímica'],
  tags: ['antibioticos', 'enzimas'],
};

const MOCK_ACTIVE_SESSIONS = [
  {
    id: 42,
    examTypeCode: 'BIR',
    examTypeName: 'Biólogo Interno Residente',
    categories: ['Bioquímica'],
    tags: ['enzimas'],
    answeredCount: 5,
    correctCount: 4,
    totalMatchingQuestions: 25,
    createdAt: '2026-11-27T10:00:00',
    finished: false,
  },
];

function mockFetchEndpoints(options?: {
  examTypes?: typeof MOCK_EXAM_TYPES;
  activeSessions?: typeof MOCK_ACTIVE_SESSIONS;
  filters?: typeof MOCK_FILTERS;
  postOk?: boolean;
  postResponse?: Record<string, unknown>;
}) {
  const examTypes = options?.examTypes ?? MOCK_EXAM_TYPES;
  const activeSessions = options?.activeSessions ?? [];
  const filters = options?.filters ?? MOCK_FILTERS;
  const postOk = options?.postOk ?? true;
  const postResponse = options?.postResponse ?? { id: 99, totalMatchingQuestions: 15 };

  (global.fetch as jest.Mock).mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method?.toUpperCase() ?? 'GET';

    if (url.includes('/api/exam-types')) {
      return { ok: true, status: 200, json: async () => examTypes };
    }
    if (url.includes('/api/review-sessions/filters')) {
      return { ok: true, status: 200, json: async () => filters };
    }
    if (url.includes('/api/review-sessions') && method === 'GET') {
      return { ok: true, status: 200, json: async () => activeSessions };
    }
    if (url.includes('/api/review-sessions') && method === 'POST') {
      return {
        ok: postOk,
        status: postOk ? 201 : 400,
        json: async () => postResponse,
      };
    }
    return { ok: true, status: 200, json: async () => [] };
  });
}

describe('RepasoConfigPage (/repaso)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await RepasoConfigPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders new review form with mandatory bank selector, category/tag textboxes (without showing all options upfront), and submit button', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });
    mockFetchEndpoints();

    const Component = await RepasoConfigPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /modo repaso/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText(/banco de preguntas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/categorías/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();

    // Categories and tags are NOT all listed upfront before typing
    expect(screen.queryByRole('button', { name: 'Farmacología' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bioquímica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'antibioticos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'enzimas' })).not.toBeInTheDocument();

    expect(screen.getByText(/todas las categorías/i)).toBeInTheDocument();
    expect(screen.getByText(/todos los tags/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /empezar repaso/i })).toBeInTheDocument();
  });

  it('shows active unfinished review sessions with a link to continue (/repaso/{id})', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });
    mockFetchEndpoints({ activeSessions: MOCK_ACTIVE_SESSIONS });

    const Component = await RepasoConfigPage();
    render(Component);

    expect(screen.getByText(/continuar repaso anterior/i)).toBeInTheDocument();
    const continueLink = screen.getByRole('link', { name: /continuar repaso/i });
    expect(continueLink).toHaveAttribute('href', '/repaso/42');
  });

  it('validates that the question bank is mandatory before submitting', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });
    mockFetchEndpoints();

    const Component = await RepasoConfigPage();
    render(Component);

    await user.click(screen.getByRole('button', { name: /empezar repaso/i }));

    expect(
      screen.getByText(/debes seleccionar un banco de preguntas|el banco de preguntas es obligatorio/i)
    ).toBeInTheDocument();

    const postCalls = (global.fetch as jest.Mock).mock.calls.filter(
      ([url, init]) => String(url).includes('/api/review-sessions') && init?.method === 'POST'
    );
    expect(postCalls).toHaveLength(0);
  });

  it('filters categories and tags as the user types in the textboxes, allows selecting/removing them, and submits to POST /api/review-sessions', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });
    mockFetchEndpoints({ postResponse: { id: 105, totalMatchingQuestions: 12 } });

    const Component = await RepasoConfigPage();
    render(Component);

    await user.selectOptions(screen.getByLabelText(/banco de preguntas/i), 'BIR');

    const categoryInput = screen.getByLabelText(/categorías/i);
    const tagInput = screen.getByLabelText(/tags/i);

    // Type in category textbox -> matching category appears
    await user.type(categoryInput, 'Farma');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Farmacología' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Bioquímica' })).not.toBeInTheDocument();

    // Select 'Farmacología'
    await user.click(screen.getByRole('button', { name: 'Farmacología' }));
    expect(categoryInput).toHaveValue('');

    // Type and select 'Bioquímica'
    await user.type(categoryInput, 'Bio');
    await user.click(screen.getByRole('button', { name: 'Bioquímica' }));

    // Type in tag textbox -> matching tag appears
    await user.type(tagInput, 'anti');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /antibioticos/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /antibioticos/i }));

    await user.type(tagInput, 'enzi');
    await user.click(screen.getByRole('button', { name: /enzimas/i }));

    await user.click(screen.getByRole('button', { name: /empezar repaso/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review-sessions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-user',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            examTypeCode: 'BIR',
            categories: ['Farmacología', 'Bioquímica'],
            tags: ['antibioticos', 'enzimas'],
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/repaso/105');
    });
  });

  it('allows toggling "Incluir sólo preguntas en duda" and "Incluir sólo preguntas fallidas" and sends onlyDoubt/onlyFailed to POST /api/review-sessions', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });
    mockFetchEndpoints({
      postResponse: { id: 210, totalMatchingQuestions: 4, onlyDoubt: true, onlyFailed: true },
    });

    const Component = await RepasoConfigPage();
    render(Component);

    await user.selectOptions(screen.getByLabelText(/banco de preguntas/i), 'BIR');

    const doubtCheckbox = screen.getByRole('checkbox', { name: /incluir sólo preguntas en duda/i });
    const failedCheckbox = screen.getByRole('checkbox', { name: /incluir sólo preguntas fallidas/i });
    expect(doubtCheckbox).not.toBeChecked();
    expect(failedCheckbox).not.toBeChecked();

    await user.click(doubtCheckbox);
    await user.click(failedCheckbox);
    expect(doubtCheckbox).toBeChecked();
    expect(failedCheckbox).toBeChecked();

    await user.click(screen.getByRole('button', { name: /empezar repaso/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/review-sessions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            examTypeCode: 'BIR',
            categories: [],
            tags: [],
            onlyDoubt: true,
            onlyFailed: true,
          }),
        })
      );
      expect(mockPush).toHaveBeenCalledWith('/repaso/210');
    });
  });
});
