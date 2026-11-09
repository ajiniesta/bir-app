import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsersPage from '@/app/admin/users/page';
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

const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.Mock;

const MOCK_USERS = [
  {
    id: 1,
    username: 'admin',
    displayName: 'Administrador',
    role: 'ADMIN',
  },
  {
    id: 2,
    username: 'alumno1',
    displayName: 'Alumno Uno',
    role: 'USER',
    allowedExamTypeCodes: ['BIR', 'MIR'],
  },
];

const MOCK_EXAM_TYPES = [
  { id: 1, code: 'BIR', name: 'Biólogo Interno Residente' },
  { id: 2, code: 'EIR', name: 'Enfermero Interno Residente' },
  { id: 3, code: 'MIR', name: 'Médico Interno Residente' },
];

describe('AdminUsersPage (/admin/users)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('redirects anonymous users to /login and does not fetch admin data', async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await AdminUsersPage();
    render(Component);

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: /administración de usuarios/i })
    ).not.toBeInTheDocument();
  });

  it('denies access to authenticated users with role USER and still provides Logout option', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'alumno1',
        role: 'USER',
        roles: ['ROLE_USER'],
        accessToken: 'jwt-user-token',
      },
    });

    const Component = await AdminUsersPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: /administración de usuarios/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it('denies access to authenticated users with role CREATOR', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'demo',
        role: 'CREATOR',
        roles: ['ROLE_CREATOR'],
        accessToken: 'jwt-creator-token',
      },
    });

    const Component = await AdminUsersPage();
    render(Component);

    expect(screen.getByRole('heading', { name: /acceso denegado/i })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('heading', { name: /administración de usuarios/i })
    ).not.toBeInTheDocument();
  });

  it('allows ADMIN users to view the user list, roles, assigned banks, and Logout button', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'jwt-admin-token',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_USERS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      });

    const Component = await AdminUsersPage();
    render(Component);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-admin-token',
        }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/exam-types'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer jwt-admin-token',
        }),
      })
    );

    expect(
      screen.getByRole('heading', { name: /administración de usuarios/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();

    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByText('@admin')).toBeInTheDocument();
    expect(screen.getByText('Alumno Uno')).toBeInTheDocument();
    expect(screen.getByText('@alumno1')).toBeInTheDocument();

    const user2Card = screen.getByTestId('user-card-2');
    const birCheckbox = within(user2Card).getByLabelText(/BIR - Biólogo Interno Residente/i);
    const mirCheckbox = within(user2Card).getByLabelText(/MIR - Médico Interno Residente/i);
    const eirCheckbox = within(user2Card).getByLabelText(/EIR - Enfermero Interno Residente/i);

    expect(birCheckbox).toBeChecked();
    expect(mirCheckbox).toBeChecked();
    expect(eirCheckbox).not.toBeChecked();
  });

  it('allows ADMIN to change a user role via PUT /api/admin/users/{id}/role', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'jwt-admin-token',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_USERS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          username: 'alumno1',
          displayName: 'Alumno Uno',
          role: 'CREATOR',
          allowedExamTypeCodes: ['BIR', 'MIR'],
        }),
      });

    const Component = await AdminUsersPage();
    render(Component);

    const user2Card = screen.getByTestId('user-card-2');
    const roleSelect = within(user2Card).getByLabelText(/rol/i);
    const saveRoleBtn = within(user2Card).getByRole('button', { name: /^guardar$/i });

    await user.selectOptions(roleSelect, 'CREATOR');
    await user.click(saveRoleBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/2/role',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer jwt-admin-token',
          }),
          body: JSON.stringify({ role: 'CREATOR' }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Cambios guardados\./i)).toBeInTheDocument();
    });
  });

  it('allows ADMIN to update a user allowed question banks via PUT /api/admin/users/{id}/banks', async () => {
    const user = userEvent.setup();
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'jwt-admin-token',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_USERS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 2,
          username: 'alumno1',
          displayName: 'Alumno Uno',
          role: 'USER',
          allowedExamTypeCodes: ['BIR', 'EIR', 'MIR'],
        }),
      });

    const Component = await AdminUsersPage();
    render(Component);

    const user2Card = screen.getByTestId('user-card-2');
    const eirCheckbox = within(user2Card).getByLabelText(/EIR - Enfermero Interno Residente/i);
    const saveBanksBtn = within(user2Card).getByRole('button', { name: /guardar bancos/i });

    await user.click(eirCheckbox);
    await user.click(saveBanksBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/users/2/banks',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer jwt-admin-token',
          }),
          body: JSON.stringify({ examTypeCodes: ['BIR', 'MIR', 'EIR'] }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Cambios guardados\./i)).toBeInTheDocument();
    });
  });

  it('shows empty state message when there are no registered users', async () => {
    mockAuth.mockResolvedValue({
      user: {
        name: 'admin',
        role: 'ADMIN',
        roles: ['ROLE_ADMIN'],
        accessToken: 'jwt-admin-token',
      },
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_EXAM_TYPES,
      });

    const Component = await AdminUsersPage();
    render(Component);

    expect(screen.getByText(/No hay usuarios registrados\./i)).toBeInTheDocument();
  });
});
