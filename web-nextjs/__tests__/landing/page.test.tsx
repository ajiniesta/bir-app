import { render, screen } from '@testing-library/react';
import LandingPage from '@/app/page';

// Mock auth or session helper if needed
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue(null),
}));

describe('LandingPage (/)', () => {
  it('renders the main heading BirApp and residency exam description', async () => {
    const Component = await LandingPage();
    render(Component);

    const heading = screen.getByRole('heading', { name: /BirApp/i, level: 1 });
    expect(heading).toBeInTheDocument();

    const description = screen.getByText(
      /Banco de preguntas tipo test para las oposiciones MIR, EIR, BIR, FIR, PIR, QIR y RFIR/i
    );
    expect(description).toBeInTheDocument();
  });

  it('renders CTA buttons for unauthenticated visitors (register and login)', async () => {
    const Component = await LandingPage();
    render(Component);

    const registerBtn = screen.getByRole('link', { name: /crear una cuenta/i });
    expect(registerBtn).toBeInTheDocument();
    expect(registerBtn).toHaveAttribute('href', '/register');

    const loginBtns = screen.getAllByRole('link', { name: /iniciar sesión/i });
    expect(loginBtns.length).toBeGreaterThanOrEqual(1);
    expect(loginBtns.some((btn) => btn.getAttribute('href') === '/login')).toBe(true);
  });

  it('renders the question banks section with exam types', async () => {
    const Component = await LandingPage();
    render(Component);

    const sectionTitle = screen.getByRole('heading', { name: /banco de preguntas/i });
    expect(sectionTitle).toBeInTheDocument();

    expect(screen.getByText('MIR')).toBeInTheDocument();
    expect(screen.getByText('BIR')).toBeInTheDocument();
    expect(screen.getByText('EIR')).toBeInTheDocument();
  });
});
