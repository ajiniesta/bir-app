import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '@/app/profile/page';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/profile',
  redirect: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  signIn: jest.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

const mockAuth = auth as jest.Mock;

describe('Profile Change Password Modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        name: 'test_user',
        role: 'USER',
        accessToken: 'dummy-token',
      },
    });
    global.fetch = jest.fn();
  });

  it('renders "Cambiar contraseña" button on ProfilePage and opens modal on click', async () => {
    const user = userEvent.setup();
    const page = await ProfilePage();
    render(page);

    const changePasswordBtn = screen.getByRole('button', { name: /cambiar contraseña/i });
    expect(changePasswordBtn).toBeInTheDocument();

    await user.click(changePasswordBtn);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cambiar contraseña/i })).toBeInTheDocument();

    expect(screen.getByLabelText(/contraseña actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar nueva contraseña/i)).toBeInTheDocument();
  });

  it('validates client-side that new passwords must match without calling the API', async () => {
    const user = userEvent.setup();
    const page = await ProfilePage();
    render(page);

    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await user.type(screen.getByLabelText(/contraseña actual/i), 'oldPass123');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'newPass456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'differentPass');

    await user.click(screen.getByRole('button', { name: /guardar contraseña|actualizar contraseña/i }));

    expect(await screen.findByText(/las nuevas contraseñas no coinciden/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('sends PUT to /api/profile/password and displays error alert when API returns error', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'La contraseña actual no es correcta' }),
    });

    const page = await ProfilePage();
    render(page);

    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await user.type(screen.getByLabelText(/contraseña actual/i), 'wrongOldPass');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'newPass456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'newPass456');

    await user.click(screen.getByRole('button', { name: /guardar contraseña|actualizar contraseña/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/profile/password',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            currentPassword: 'wrongOldPass',
            newPassword: 'newPass456',
            confirmPassword: 'newPass456',
          }),
        })
      );
    });

    expect(await screen.findByText(/la contraseña actual no es correcta/i)).toBeInTheDocument();
  });

  it('sends PUT to /api/profile/password and displays success message on success', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Contraseña modificada correctamente' }),
    });

    const page = await ProfilePage();
    render(page);

    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));

    await user.type(screen.getByLabelText(/contraseña actual/i), 'validOld123');
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'validNew456');
    await user.type(screen.getByLabelText(/confirmar nueva contraseña/i), 'validNew456');

    await user.click(screen.getByRole('button', { name: /guardar contraseña|actualizar contraseña/i }));

    expect(await screen.findByText(/contraseña modificada correctamente/i)).toBeInTheDocument();
  });

  it('closes modal when clicking Cancelar button', async () => {
    const user = userEvent.setup();
    const page = await ProfilePage();
    render(page);

    await user.click(screen.getByRole('button', { name: /cambiar contraseña/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
