import { render, screen } from '@testing-library/react';
import LoginPage from '@/app/login/page';

describe('LoginPage (/login)', () => {
  it('renders the main heading BirApp and subtitle', () => {
    render(<LoginPage />);

    const heading = screen.getByRole('heading', { name: /BirApp/i, level: 1 });
    expect(heading).toBeInTheDocument();

    const subtitle = screen.getByText(/Entra para practicar en modo libre/i);
    expect(subtitle).toBeInTheDocument();
  });

  it('renders the username and password inputs with required attributes', () => {
    render(<LoginPage />);

    const usernameInput = screen.getByLabelText(/usuario/i);
    expect(usernameInput).toBeInTheDocument();
    expect(usernameInput).toHaveAttribute('type', 'text');
    expect(usernameInput).toBeRequired();

    const passwordInput = screen.getByLabelText(/contraseña/i);
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toBeRequired();
  });

  it('renders the submit button "Entrar"', () => {
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /entrar/i });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
  });

  it('renders navigation links to register and back to home', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /regístrate/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');

    const homeLink = screen.getByRole('link', { name: /volver al inicio/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute('href', '/');
  });
});
