import { render, screen } from '@testing-library/react';
import SimulacroPdfPage from '@/app/simulacros/[id]/pdf/page';
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

const MOCK_EXAM_FOR_PDF = {
  id: 1,
  title: 'Simulacro MIR 2026 - Convocatoria Enero',
  description: 'Instrucciones: use bolígrafo azul o negro.',
  examTypeCode: 'MIR',
  examTypeName: 'Médico Interno Residente',
  questionCount: 2,
  questions: [
    {
      position: 1,
      questionId: 101,
      text: '¿Cuál es el agente causal de la neumonía típica adquirida en la comunidad?',
      category: 'Neumología',
      tag: 'infecciosas',
      explanation: 'Streptococcus pneumoniae es el patógeno bacteriano predominante.',
      options: [
        { letter: 'A', text: 'Streptococcus pneumoniae' },
        { letter: 'B', text: 'Mycoplasma pneumoniae' },
      ],
    },
    {
      position: 2,
      questionId: 102,
      text: '¿Qué prueba diagnóstica es el gold standard para el reflujo gastroesofágico?',
      category: 'Digestivo',
      tag: 'diagnostico',
      explanation: 'La pH-metría de 24 horas es la prueba estándar.',
      options: [
        { letter: 'A', text: 'Endoscopia digestiva alta' },
        { letter: 'B', text: 'pH-metría de 24 horas' },
      ],
    },
  ],
};

describe('SimulacroPdfPage (/simulacros/[id]/pdf)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects unauthenticated users to /login', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await SimulacroPdfPage({
      params: Promise.resolve({ id: '1' }),
    });
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders printable exam with questions and answer sheet without correct answers', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-1' },
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_EXAM_FOR_PDF,
    });

    const Component = await SimulacroPdfPage({
      params: Promise.resolve({ id: '1' }),
    });
    render(Component);

    // Title and metadata
    expect(screen.getByRole('heading', { level: 1, name: 'Simulacro MIR 2026 - Convocatoria Enero' })).toBeInTheDocument();
    expect(screen.getByText(/médico interno residente \(mir\)/i)).toBeInTheDocument();
    expect(screen.getByText('Instrucciones: use bolígrafo azul o negro.')).toBeInTheDocument();

    // Questions and options
    expect(screen.getByText('¿Cuál es el agente causal de la neumonía típica adquirida en la comunidad?')).toBeInTheDocument();
    expect(screen.getByText('Streptococcus pneumoniae')).toBeInTheDocument();
    expect(screen.getByText('Mycoplasma pneumoniae')).toBeInTheDocument();

    expect(screen.getByText('¿Qué prueba diagnóstica es el gold standard para el reflujo gastroesofágico?')).toBeInTheDocument();
    expect(screen.getByText('Endoscopia digestiva alta')).toBeInTheDocument();
    expect(screen.getByText('pH-metría de 24 horas')).toBeInTheDocument();

    // Must NOT reveal correct answers
    expect(screen.queryByText(/^correcta$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/respuesta correcta/i)).not.toBeInTheDocument();

    // Answer sheet
    expect(screen.getByRole('heading', { level: 2, name: /hoja de respuestas/i })).toBeInTheDocument();
  });
});
