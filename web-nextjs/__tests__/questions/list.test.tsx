import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestionsPage from '@/app/questions/page';
import QuestionsListClient from '@/app/questions/QuestionsListClient';
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

const MOCK_PAGE_RESPONSE = {
  items: [
    {
      id: 1,
      text: '¿Cuál es la función principal de la insulina?',
      category: 'Endocrinología',
      tag: 'metabolismo',
      examTypeCode: 'MIR',
    },
    {
      id: 2,
      text: '¿Qué tipo de ácido nucleico tiene el virus de la gripe?',
      category: 'Microbiología',
      tag: 'virologia',
      examTypeCode: 'BIR',
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

const MOCK_CATEGORIES = ['Endocrinología', 'Microbiología'];
const MOCK_TAGS = ['metabolismo', 'virologia'];

describe('QuestionsPage (/questions)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await QuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'user1',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'token-user',
      },
    });

    const Component = await QuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows CREATOR users and renders questions list and filters', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'creator1',
        role: 'CREATOR',
        roles: ['ROLE_CREATOR'],
        accessToken: 'token-creator',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_PAGE_RESPONSE,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_CATEGORIES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_TAGS,
      });

    const Component = await QuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('heading', { name: /preguntas/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\+ nueva pregunta/i })).toHaveAttribute(
      'href',
      '/questions/create'
    );

    // Filters exist
    expect(screen.getByPlaceholderText(/texto de la pregunta/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /banco/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /categoría/i })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /tag/i })).toBeInTheDocument();

    // Questions rendered
    expect(screen.getByText('¿Cuál es la función principal de la insulina?')).toBeInTheDocument();
    expect(screen.getAllByText('MIR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Endocrinología').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('#metabolismo')).toBeInTheDocument();

    expect(screen.getByText('¿Qué tipo de ácido nucleico tiene el virus de la gripe?')).toBeInTheDocument();
    expect(screen.getAllByText('BIR').length).toBeGreaterThanOrEqual(1);

    // Action links
    const verLinks = screen.getAllByRole('link', { name: /ver/i });
    expect(verLinks[0]).toHaveAttribute('href', '/questions/1');
    const editLinks = screen.getAllByRole('link', { name: /editar/i });
    expect(editLinks[0]).toHaveAttribute('href', '/questions/1/edit');
  });

  it('renders empty alert when no questions exist', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'token-admin',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [],
          page: 1,
          size: 20,
          total: 0,
          totalPages: 0,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const Component = await QuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByText(/no hay preguntas disponibles/i)).toBeInTheDocument();
  });

  it('handles question deletion with confirmation', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'token-admin',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_PAGE_RESPONSE,
      })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_CATEGORIES })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_TAGS });

    const Component = await QuestionsPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i });
    expect(deleteButtons.length).toBe(2);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('¿Eliminar esta pregunta?');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/questions/1'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-admin',
        }),
      })
    );
  });

  it('renders a window of 5 pages when totalPages is large and advances the window on later pages', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'token-admin',
      },
    });

    // Page 1 of 10
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 1, text: 'Pregunta 1', examTypeCode: 'MIR' }],
          page: 1,
          size: 20,
          total: 200,
          totalPages: 10,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    const { unmount } = render(
      await QuestionsPage({ searchParams: Promise.resolve({ page: '1' }) })
    );

    const paginationNav = screen.getByRole('navigation', { name: /paginación de preguntas/i });
    const pageLinks = within(paginationNav).getAllByRole('link');
    // Page 1 should show: Anterior, 1, 2, 3, 4, 5, Siguiente
    const linkTexts = pageLinks.map((l) => l.textContent?.trim());
    expect(linkTexts).toEqual(['Anterior', '1', '2', '3', '4', '5', 'Siguiente']);

    unmount();

    // Now test page 6 of 10: window should center around 6 -> 4, 5, 6, 7, 8
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ id: 60, text: 'Pregunta 60', examTypeCode: 'MIR' }],
          page: 6,
          size: 20,
          total: 200,
          totalPages: 10,
        }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => [] });

    render(
      await QuestionsPage({ searchParams: Promise.resolve({ page: '6' }) })
    );

    const paginationNavPage6 = screen.getByRole('navigation', { name: /paginación de preguntas/i });
    const pageLinksPage6 = within(paginationNavPage6).getAllByRole('link');
    const linkTextsPage6 = pageLinksPage6.map((l) => l.textContent?.trim());
    expect(linkTextsPage6).toEqual(['Anterior', '4', '5', '6', '7', '8', 'Siguiente']);
  });

  it('updates displayed questions when initialData changes due to filtering or pagination', () => {
    const { rerender } = render(
      <QuestionsListClient
        initialData={{
          items: [{ id: 1, text: 'Pregunta Inicial', examTypeCode: 'MIR' }],
          page: 1,
          size: 20,
          total: 10,
          totalPages: 1,
        }}
        examTypes={[]}
        categories={[]}
        tags={[]}
        currentQuery={{ q: '', examType: '', category: '', tag: '', page: 1 }}
      />
    );

    expect(screen.getByText('Pregunta Inicial')).toBeInTheDocument();

    // Now props change (server component re-rendered with new filter results)
    rerender(
      <QuestionsListClient
        initialData={{
          items: [{ id: 2, text: 'Pregunta Filtrada por Búsqueda', examTypeCode: 'MIR' }],
          page: 1,
          size: 20,
          total: 1,
          totalPages: 1,
        }}
        examTypes={[]}
        categories={[]}
        tags={[]}
        currentQuery={{ q: 'Búsqueda', examType: '', category: '', tag: '', page: 1 }}
      />
    );

    expect(screen.queryByText('Pregunta Inicial')).not.toBeInTheDocument();
    expect(screen.getByText('Pregunta Filtrada por Búsqueda')).toBeInTheDocument();
  });
});
