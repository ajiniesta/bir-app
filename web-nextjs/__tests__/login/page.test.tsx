import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';

describe('LoginPage (/login)', () => {
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
});
