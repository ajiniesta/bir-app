import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionDuplicatesPage from '@/app/questions/duplicates/page';
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

const MOCK_PREVIEW_DUPLICATES = {
  groups: [
    {
      examTypeId: 2,
      examTypeCode: 'MIR',
      text: '¿Cuál es la causa más frecuente de estenosis aórtica degenerativa?',
      keepId: 101,
      keepReason: 'con explicación y más antigua',
      duplicates: [
        {
          id: 102,
          category: 'Cardiología',
          tag: 'valvulopatias',
          hasExplanation: false,
          optionCount: 4,
          inMockExam: true,
          hasProposals: false,
          inFreeSessions: true,
        },
      ],
    },
  ],
  totalGroups: 1,
  totalDuplicates: 1,
  truncated: false,
  similarGroups: [
    {
      examTypeId: 2,
      examTypeCode: 'MIR',
      text: '¿Tratamiento de primera línea en hipertensión arterial?',
      questionIds: [201, 202],
    },
  ],
};

const MOCK_PURGE_RESPONSE = {
  groupsProcessed: 1,
  deleted: 1,
  mockExamLinksRepointed: 1,
  mockExamLinksRemoved: 0,
  positionsRenumbered: 0,
  proposalsRepointed: 0,
  proposalsDeleted: 0,
  sessionItemsRepointed: 1,
  remaining: 0,
  notes: [],
};

describe('QuestionDuplicatesPage (/questions/duplicates)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
  });

  it('renders bank selector and "Buscar duplicadas" button for ADMIN/CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EXAM_TYPES,
    });

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(screen.getByRole('heading', { level: 1, name: /preguntas duplicadas/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/banco de preguntas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buscar duplicadas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver/i })).toHaveAttribute('href', '/questions');
  });

  it('renders message when no duplicates exist in the bank', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    // 1: GET /api/exam-types
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EXAM_TYPES,
    });
    // 2: GET /api/questions/duplicates?examType=BIR
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        groups: [],
        totalGroups: 0,
        totalDuplicates: 0,
        truncated: false,
        similarGroups: [],
      }),
    });

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({ examType: 'BIR' }),
    });
    render(Component);

    expect(screen.getByText(/no hay preguntas duplicadas en este banco/i)).toBeInTheDocument();
  });

  it('renders preview of duplicate groups with keep reason and candidates', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'creator_user', role: 'CREATOR', roles: ['ROLE_CREATOR'], accessToken: 'token-creator' },
    });

    // 1: GET /api/exam-types
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EXAM_TYPES,
    });
    // 2: GET /api/questions/duplicates?examType=MIR
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PREVIEW_DUPLICATES,
    });

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({ examType: 'MIR' }),
    });
    render(Component);

    // Summary
    expect(screen.getByText(/1 grupo/i)).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName.toLowerCase() === 'p' && /se borrarían 1 pregunta/i.test(el.textContent || ''))
    ).toBeInTheDocument();

    // Warning and confirmation checkbox
    expect(screen.getByText(/esta acción no se puede deshacer/i)).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', {
      name: /entiendo que las preguntas duplicadas se eliminarán definitivamente/i,
    });
    expect(checkbox).not.toBeChecked();

    const purgeBtn = screen.getByRole('button', { name: /borrar duplicadas/i });
    expect(purgeBtn).toBeDisabled();

    // Table content
    expect(screen.getByText('¿Cuál es la causa más frecuente de estenosis aórtica degenerativa?')).toBeInTheDocument();
    expect(screen.getByText('con explicación y más antigua')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#101' })).toHaveAttribute('href', '/questions/101');
    expect(screen.getByRole('link', { name: '#102' })).toHaveAttribute('href', '/questions/102');

    // Badges on duplicate
    expect(screen.getByText('en simulacro')).toBeInTheDocument();
    expect(screen.getByText('en sesiones')).toBeInTheDocument();

    // Similar groups alert
    expect(screen.getByText(/mismo enunciado pero con opciones distintas/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Tratamiento de primera línea en hipertensión arterial\?/i)).toBeInTheDocument();
  });

  it('enables purge button on confirmation and purges duplicates', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin_user', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    // 1: GET /api/exam-types
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EXAM_TYPES,
    });
    // 2: GET /api/questions/duplicates?examType=MIR
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PREVIEW_DUPLICATES,
    });
    // 3: POST /api/questions/duplicates/purge
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PURGE_RESPONSE,
    });

    const Component = await QuestionDuplicatesPage({
      searchParams: Promise.resolve({ examType: 'MIR' }),
    });
    render(Component);

    const checkbox = screen.getByRole('checkbox', {
      name: /entiendo que las preguntas duplicadas se eliminarán definitivamente/i,
    });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    const purgeBtn = screen.getByRole('button', { name: /borrar duplicadas/i });
    expect(purgeBtn).toBeEnabled();
    await user.click(purgeBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/questions/duplicates/purge'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ examType: 'MIR' }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText(/limpieza terminada/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/preguntas borradas:/i)).toBeInTheDocument();
    });
  });
});
