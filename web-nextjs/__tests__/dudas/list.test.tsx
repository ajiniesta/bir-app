import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoubtQuestionsPage from '@/app/dudas/page';
import { auth } from '@/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockRedirect = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
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

const MOCK_DOUBTS_PAGE_RESPONSE = {
  items: [
    {
      id: 11,
      text: '¿Cuál es el mecanismo de acción de los betalactámicos?',
      category: 'Farmacología',
      tag: 'antibioticos, pared',
      tags: ['antibioticos', 'pared'],
      examTypeCode: 'BIR',
      learningStatus: 'DOUBT',
    },
    {
      id: 12,
      text: '¿Qué enzima cataliza el paso limitante de la glucólisis?',
      category: 'Bioquímica',
      tag: 'metabolismo',
      tags: ['metabolismo'],
      examTypeCode: 'MIR',
      learningStatus: 'FAILED',
    },
  ],
  page: 1,
  size: 20,
  total: 2,
  totalPages: 1,
};

const MOCK_EXAM_TYPES = [
  { id: 1, code: 'BIR', name: 'Biólogo Interno Residente' },
  { id: 2, code: 'MIR', name: 'Médico Interno Residente' },
];

const MOCK_CATEGORIES = ['Bioquímica', 'Farmacología'];
const MOCK_TAGS = ['antibioticos', 'metabolismo', 'pared'];

describe('DoubtQuestionsPage (/dudas)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await DoubtQuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows authenticated USER role and renders paginated list of doubt questions with filters, detail links, and review button', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'student',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'token-user',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_DOUBTS_PAGE_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_CATEGORIES,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_TAGS,
      });

    const Component = await DoubtQuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('heading', { name: /preguntas en duda/i, level: 1 })).toBeInTheDocument();

    // Filters exist (including Estado filter)
    expect(screen.getByPlaceholderText(/texto de la pregunta/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /banco/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /categoría/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /tag/i })).toBeInTheDocument();
    const statusSelect = screen.getByRole('combobox', { name: /estado/i });
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect).toHaveValue('');

    // Questions rendered with their status badges
    expect(screen.getByText('¿Cuál es el mecanismo de acción de los betalactámicos?')).toBeInTheDocument();
    expect(screen.getByText('#antibioticos')).toBeInTheDocument();
    expect(screen.getByText('En duda')).toBeInTheDocument();
    expect(screen.getByText('¿Qué enzima cataliza el paso limitante de la glucólisis?')).toBeInTheDocument();
    expect(screen.getByText('Fallida')).toBeInTheDocument();

    // Detail links
    const detailLinks = screen.getAllByRole('link', { name: /ver detalle/i });
    expect(detailLinks[0]).toHaveAttribute('href', '/dudas/11');
    expect(detailLinks[1]).toHaveAttribute('href', '/dudas/12');

    // Start review session action exists
    expect(
      screen.getByRole('button', { name: /iniciar sesión de repaso/i })
    ).toBeInTheDocument();
  });

  it('starts a doubt review session directly when a bank is selected and "Iniciar sesión de repaso" is clicked', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: {
        name: 'student',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'token-user',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_DOUBTS_PAGE_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_CATEGORIES,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => MOCK_TAGS,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 77, onlyDoubt: true }),
      });

    const Component = await DoubtQuestionsPage({
      searchParams: Promise.resolve({ examType: 'BIR' }),
    });
    render(Component);

    await user.click(screen.getByRole('button', { name: /iniciar sesión de repaso/i }));

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
      expect(mockPush).toHaveBeenCalledWith('/repaso/77');
    });
  });

  it('renders pagination controls when totalPages > 1', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'student',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'token-user',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          items: [{ id: 1, text: 'Pregunta 1 en duda', examTypeCode: 'BIR' }],
          page: 2,
          size: 20,
          total: 45,
          totalPages: 3,
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => [] });

    const Component = await DoubtQuestionsPage({ searchParams: Promise.resolve({ page: '2' }) });
    render(Component);

    const paginationNav = screen.getByRole('navigation', { name: /paginación de preguntas en duda/i });
    const pageLinks = within(paginationNav).getAllByRole('link');
    expect(pageLinks.map((l) => l.textContent?.trim())).toEqual(['Anterior', '1', '2', '3', 'Siguiente']);
  });
});
