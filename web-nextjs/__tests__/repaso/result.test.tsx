import { render, screen } from '@testing-library/react';
import RepasoResultPage from '@/app/repaso/[id]/result/page';
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

const MOCK_REVIEW_RESULT = {
  id: 77,
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  categories: ['Cardiología', 'Neurología'],
  tags: ['arritmias'],
  totalMatchingQuestions: 20,
  answeredCount: 2,
  correctCount: 1,
  accuracy: 50,
  hasMoreQuestions: false,
  finished: true,
  byCategory: [
    {
      category: 'Cardiología',
      answered: 1,
      correct: 1,
      accuracy: 100,
    },
    {
      category: 'Neurología',
      answered: 1,
      correct: 0,
      accuracy: 0,
    },
  ],
  items: [
    {
      position: 1,
      questionId: 101,
      questionText: '¿Cuál es el tratamiento de primera línea en fibrilación auricular rápida?',
      category: 'Cardiología',
      tag: 'arritmias',
      tags: ['arritmias'],
      explanation: 'Los betabloqueantes o calcioantagonistas son primera línea para control de frecuencia.',
      options: [
        { letter: 'A', text: 'Betabloqueantes' },
        { letter: 'B', text: 'Atropina' },
      ],
      answered: true,
      selectedLetter: 'A',
      correct: true,
      correctLetter: 'A',
    },
    {
      position: 2,
      questionId: 102,
      questionText: '¿Qué par craneal inerva el músculo recto lateral del ojo?',
      category: 'Neurología',
      tag: 'pares craneales',
      tags: ['pares craneales'],
      explanation: 'El VI par craneal (abducens) inerva el músculo recto lateral.',
      options: [
        { letter: 'A', text: 'III par craneal' },
        { letter: 'B', text: 'VI par craneal' },
      ],
      answered: true,
      selectedLetter: 'A',
      correct: false,
      correctLetter: 'B',
    },
  ],
};

describe('RepasoResultPage (/repaso/[id]/result)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await RepasoResultPage({ params: Promise.resolve({ id: '77' }) });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders general summary statistics, category breakdown table, resolved questions list, and navigation links', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'student', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_REVIEW_RESULT,
    });

    const Component = await RepasoResultPage({ params: Promise.resolve({ id: '77' }) });
    render(Component);

    expect(screen.getByRole('heading', { name: /resumen del repaso/i })).toBeInTheDocument();

    // General stats labels and percentage
    expect(screen.getAllByText(/respondidas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/acertadas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/falladas/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/acierto/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Category statistics breakdown
    expect(screen.getByText(/estadísticas por categoría/i)).toBeInTheDocument();
    expect(screen.getAllByText('Cardiología').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Neurología').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100%')).toBeInTheDocument();

    // Resolved questions list
    expect(
      screen.getByText(/¿Cuál es el tratamiento de primera línea en fibrilación auricular rápida\?/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/¿Qué par craneal inerva el músculo recto lateral del ojo\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Correcta')).toBeInTheDocument();
    expect(screen.getByText('Incorrecta')).toBeInTheDocument();
    expect(
      screen.getByText(/Los betabloqueantes o calcioantagonistas son primera línea/i)
    ).toBeInTheDocument();

    // Action links
    expect(screen.getByRole('link', { name: /nuevo repaso/i })).toHaveAttribute('href', '/repaso');
    expect(screen.getByRole('link', { name: /volver al panel/i })).toHaveAttribute('href', '/');
  });
});
