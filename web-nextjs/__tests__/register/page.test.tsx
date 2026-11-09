import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterPage from '@/app/register/page';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('RegisterPage (/register)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('renders heading "Crear cuenta" and subtitle', () => {
    render(<RegisterPage />);

    const heading = screen.getByRole('heading', { name: /crear cuenta/i, level: 1 });
    expect(heading).toBeInTheDocument();

    const subtitle = screen.getByText(/Regístrate para guardar tus estadísticas/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('renders all form inputs and helper texts with constraints', () => {
    render(<RegisterPage />);

    const displayNameInput = screen.getByLabelText(/nombre/i);
    expect(displayNameInput).toBeInTheDocument();
    expect(displayNameInput).not.toBeRequired();
    expect(displayNameInput).toHaveAttribute('placeholder', 'Opcional');

    const usernameInput = screen.getByLabelText(/usuario/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toBeRequired();
    expect(usernameInput).toHaveAttribute('minlength', '3');
    expect(usernameInput).toHaveAttribute('maxlength', '50');
    expect(screen.getByText(/Entre 3 y 50 caracteres\./i)).toBeInTheDocument();

    const passwordInput = screen.getByLabelText(/contraseña/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
    expect(passwordInput).toHaveAttribute('minlength', '6');
    expect(passwordInput).toHaveAttribute('maxlength', '100');
    expect(screen.getByText(/Mínimo 6 caracteres\./i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /crear cuenta/i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveAttribute('type', 'submit');
  });

  it('renders navigation links to login and home', () => {
    render(<RegisterPage />);

    const loginLink = screen.getByRole('link', { name: /inicia sesión/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');

    const homeLink = screen.getByRole('link', { name: /volver al inicio/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('submits registration form successfully and redirects to login', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, username: 'testuser', displayName: 'Tester', role: 'USER' }),
    });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/nombre/i), 'Tester');
    await user.type(screen.getByLabelText(/usuario/i), 'testuser');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Tester',
          username: 'testuser',
          password: 'password123',
        }),
      }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?registered=true');
    });
  });

  it('displays error alert when registration fails', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'El nombre de usuario ya está en uso' }),
    });

    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/usuario/i), 'existinguser');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre de usuario ya está en uso/i)).toBeInTheDocument();
    });
  });
});
