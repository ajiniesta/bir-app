import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/login/page';
import { auth } from '@/auth';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.Mock;

describe('LoginPage (/login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(null);
  });

  it('renders the main heading BirApp and subtitle', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const heading = screen.getByRole('heading', { name: /BirApp/i, level: 1 });
    expect(heading).toBeInTheDocument();

    const subtitle = screen.getByText(/Entra para practicar en modo libre/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('renders the username and password inputs with required attributes', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const usernameInput = screen.getByLabelText(/usuario/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toBeRequired();

    const passwordInput = screen.getByLabelText(/contraseña/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
  });

  it('renders the submit button "Entrar"', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('renders navigation links to register and back to home', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    const registerLink = screen.getByRole('link', { name: /regístrate/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');

    const homeLink = screen.getByRole('link', { name: /volver al inicio/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('renders success message when registered=true is in searchParams', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({ registered: 'true' }) });
    render(Component);

    expect(screen.getByText(/Cuenta creada correctamente\. Inicia sesión\./i)).toBeInTheDocument();
  });

  it('renders error alert when error is in searchParams', async () => {
    const Component = await LoginPage({ searchParams: Promise.resolve({ error: 'CredentialsSignin' }) });
    render(Component);

    expect(screen.getByText(/Usuario o contraseña incorrectos/i)).toBeInTheDocument();
  });

  it('authenticates user on submit and redirects to the Landing Page (/)', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null });

    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    await user.type(screen.getByLabelText(/usuario/i), 'demo');
    await user.type(screen.getByLabelText(/contraseña/i), 'demo1234');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({
          username: 'demo',
          password: 'demo1234',
          redirect: false,
        })
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('shows error alert and does not redirect when credentials are invalid', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValueOnce({ ok: false, error: 'CredentialsSignin' });

    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    await user.type(screen.getByLabelText(/usuario/i), 'demo');
    await user.type(screen.getByLabelText(/contraseña/i), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Usuario o contraseña incorrectos/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('renders Logout option when a logged-in user visits the view', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'demo', role: 'CREATOR' },
    });

    const Component = await LoginPage({ searchParams: Promise.resolve({}) });
    render(Component);

    expect(screen.getByRole('button', { name: /cerrar sesión/i })).toBeInTheDocument();
  });
});
