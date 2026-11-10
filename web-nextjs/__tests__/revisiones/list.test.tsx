import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReviewPage from '@/app/revisiones/page';
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

const MOCK_PROPOSALS = [
  {
    id: 10,
    questionId: 42,
    questionText: '¿Cuál es la capital de Francia?',
    category: 'Geografía',
    tag: 'europa',
    examTypeCode: 'MIR',
    correctLetter: 'A',
    options: [
      { letter: 'A', text: 'París', isCorrect: true },
      { letter: 'B', text: 'Lyon', isCorrect: false },
    ],
    proposedBy: 'alumno1',
    proposedByDisplayName: 'Alumno Uno',
    proposedLetter: 'B',
    proposedText: null,
    comment: 'La pregunta está mal formulada.',
    source: 'FREE_SESSION',
    sourceId: 88,
    position: 1,
    selectedLetter: 'B',
    status: 'PENDING',
    createdAt: '2026-02-10T12:00:00',
    reviewedBy: null,
    reviewedAt: null,
    reviewerNote: null,
    appliedBy: null,
    appliedAt: null,
  },
];

const MOCK_EXAM_TYPES = [
  { id: 1, code: 'BIR', name: 'Biólogo Interno Residente' },
  { id: 2, code: 'MIR', name: 'Médico Interno Residente' },
];

describe('ReviewPage (/revisiones)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    window.confirm = jest.fn(() => true);
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('denies access to users with role USER', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renders review list with filters and proposals for ADMIN or CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_PROPOSALS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      });

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('heading', { name: /modo revisión de respuestas/i })).toBeInTheDocument();

    // Filters
    expect(screen.getByLabelText(/estado/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/banco/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filtrar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /limpiar/i })).toHaveAttribute('href', '/revisiones');

    // Proposal card
    expect(screen.getByText('¿Cuál es la capital de Francia?')).toBeInTheDocument();
    expect(screen.getAllByText('MIR').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Geografía')).toBeInTheDocument();
    expect(screen.getByText('#europa')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver pregunta #42/i })).toHaveAttribute('href', '/questions/42');

    // Options
    expect(screen.getByText('Correcta actual')).toBeInTheDocument();
    expect(screen.getByText('Propuesta')).toBeInTheDocument();

    // Details
    expect(screen.getByText(/motivo:/i)).toBeInTheDocument();
    expect(screen.getByText('La pregunta está mal formulada.')).toBeInTheDocument();

    // Actions
    expect(screen.getByRole('button', { name: /aceptar y aplicar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /rechazar/i })).toBeInTheDocument();
  });

  it('renders notice when no proposals match filter', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'creator', role: 'CREATOR', roles: ['ROLE_CREATOR'], accessToken: 'token-creator' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES });

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByText(/no hay propuestas que mostrar con este filtro/i)).toBeInTheDocument();
  });

  it('accepts and applies a proposal after confirmation', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_PROPOSALS })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES });

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const noteInput = screen.getByPlaceholderText(/nota de revisión/i);
    await user.type(noteInput, 'Aceptada según fuentes oficiales.');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_PROPOSALS[0], status: 'ACCEPTED' }),
    });

    const acceptBtn = screen.getByRole('button', { name: /aceptar y aplicar/i });
    await user.click(acceptBtn);

    expect(window.confirm).toHaveBeenCalledWith(
      expect.stringContaining('¿Aceptar la propuesta?')
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proposals/10/review'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-admin',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            status: 'ACCEPTED',
            note: 'Aceptada según fuentes oficiales.',
          }),
        })
      );
    });
  });

  it('rejects a proposal with an optional note', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_PROPOSALS })
      .mockResolvedValueOnce({ ok: true, json: async () => MOCK_EXAM_TYPES });

    const Component = await ReviewPage({ searchParams: Promise.resolve({}) });
    render(Component);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...MOCK_PROPOSALS[0], status: 'REJECTED' }),
    });

    const rejectBtn = screen.getByRole('button', { name: /rechazar/i });
    await user.click(rejectBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/proposals/10/review'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer token-admin',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            status: 'REJECTED',
            note: '',
          }),
        })
      );
    });
  });
});
