import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateSimulacroPage from '@/app/simulacros/new/page';
import EditSimulacroPage from '@/app/simulacros/[id]/edit/page';
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

const MOCK_QUESTIONS = [
  {
    id: 101,
    examTypeId: 2,
    examTypeCode: 'MIR',
    text: '¿Cuál es el tratamiento de la hipertensión esencial?',
    category: 'Cardiología',
    tag: 'farmacos',
  },
  {
    id: 102,
    examTypeId: 2,
    examTypeCode: 'MIR',
    text: '¿Qué marcador biológico indica daño miocárdico precoz?',
    category: 'Cardiología',
    tag: 'enzimas',
  },
  {
    id: 201,
    examTypeId: 1,
    examTypeCode: 'BIR',
    text: '¿Qué enzima cataliza la síntesis de ARN a partir de ADN?',
    category: 'Genética',
    tag: 'transcripcion',
  },
];

const MOCK_EXISTING_SIMULACRO = {
  id: 5,
  title: 'Simulacro Existente MIR',
  description: 'Descripción del simulacro existente',
  examTypeId: 2,
  examTypeCode: 'MIR',
  questionCount: 1,
  questions: [
    {
      position: 1,
      questionId: 101,
      text: '¿Cuál es el tratamiento de la hipertensión esencial?',
      category: 'Cardiología',
      tag: 'farmacos',
      options: [],
    },
  ],
};

describe('Simulacro Forms (New & Edit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('CreateSimulacroPage (/simulacros/new)', () => {
    it('redirects unauthenticated users to /login', async () => {
      mockAuth.mockResolvedValue(null);

      const Component = await CreateSimulacroPage();
      render(Component);

      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('denies access to users with role USER', async () => {
      mockAuth.mockResolvedValue({
        user: { name: 'user1', role: 'USER', roles: ['ROLE_USER'], accessToken: 'token-user' },
      });

      const Component = await CreateSimulacroPage();
      render(Component);

      expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    });

    it('creates a new mock exam when filled by CREATOR', async () => {
      const user = userEvent.setup();
      mockAuth.mockResolvedValue({
        user: { name: 'creator', role: 'CREATOR', roles: ['ROLE_CREATOR'], accessToken: 'token-creator' },
      });

      // 1: GET /api/exam-types
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      });
      // 2: GET /api/questions
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_QUESTIONS,
      });
      // 3: POST /api/mock-exams
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 50, title: 'Nuevo Simulacro MIR' }),
      });

      const Component = await CreateSimulacroPage();
      render(Component);

      expect(screen.getByRole('heading', { level: 1, name: /nuevo simulacro/i })).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/título/i);
      await user.type(titleInput, 'Nuevo Simulacro MIR');

      const descInput = screen.getByLabelText(/descripción/i);
      await user.type(descInput, 'Preparación para el examen');

      const examTypeSelect = screen.getByLabelText(/banco de preguntas/i);
      await user.selectOptions(examTypeSelect, '2'); // MIR

      // Question list for MIR should be displayed
      expect(screen.getByText('¿Cuál es el tratamiento de la hipertensión esencial?')).toBeInTheDocument();
      expect(screen.queryByText('¿Qué enzima cataliza la síntesis de ARN a partir de ADN?')).not.toBeInTheDocument();

      // Check the first question
      const checkbox = screen.getByRole('checkbox', {
        name: /¿cuál es el tratamiento de la hipertensión esencial\?/i,
      });
      await user.click(checkbox);

      expect(screen.getByText(/seleccionadas:\s*1/i)).toBeInTheDocument();

      // Submit form
      const submitBtn = screen.getByRole('button', { name: /crear simulacro/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/mock-exams'),
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              title: 'Nuevo Simulacro MIR',
              description: 'Preparación para el examen',
              examTypeId: 2,
              questionIds: [101],
            }),
          })
        );
        expect(mockPush).toHaveBeenCalledWith('/simulacros/50');
      });
    });
  });

  describe('EditSimulacroPage (/simulacros/[id]/edit)', () => {
    it('loads existing mock exam and updates it', async () => {
      const user = userEvent.setup();
      mockAuth.mockResolvedValue({
        user: { name: 'admin', role: 'ADMIN', roles: ['ROLE_ADMIN'], accessToken: 'token-admin' },
      });

      // 1: GET /api/mock-exams/5
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXISTING_SIMULACRO,
      });
      // 2: GET /api/exam-types
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      });
      // 3: GET /api/questions
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_QUESTIONS,
      });
      // 4: PUT /api/mock-exams/5
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 5, title: 'Simulacro Existente MIR Editado' }),
      });

      const Component = await EditSimulacroPage({ params: Promise.resolve({ id: '5' }) });
      render(Component);

      expect(screen.getByRole('heading', { level: 1, name: /editar simulacro/i })).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/título/i);
      expect(titleInput).toHaveValue('Simulacro Existente MIR');

      // Check that 101 was pre-selected
      expect(screen.getByText(/seleccionadas:\s*1/i)).toBeInTheDocument();

      // Check second question (102) to add it
      const q2Checkbox = screen.getByRole('checkbox', {
        name: /¿qué marcador biológico indica daño miocárdico precoz\?/i,
      });
      await user.click(q2Checkbox);
      expect(screen.getByText(/seleccionadas:\s*2/i)).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /guardar cambios/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/mock-exams/5'),
          expect.objectContaining({
            method: 'PUT',
            body: JSON.stringify({
              title: 'Simulacro Existente MIR',
              description: 'Descripción del simulacro existente',
              examTypeId: 2,
              questionIds: [101, 102],
            }),
          })
        );
        expect(mockPush).toHaveBeenCalledWith('/simulacros/5');
      });
    });
  });
});
