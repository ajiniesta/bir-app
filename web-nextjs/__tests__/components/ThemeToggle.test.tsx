import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '@/app/components/ThemeToggle';

describe('ThemeToggle component', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('renders theme toggle button with accessible label', () => {
    render(<ThemeToggle />);
    const toggleButton = screen.getByRole('button', { name: /cambiar tema|modo oscuro|modo claro/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles dark class on documentElement and saves preference to localStorage on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const toggleButton = screen.getByRole('button', { name: /cambiar tema|modo oscuro|modo claro/i });

    // Initially light mode
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Click to activate dark mode
    await user.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('bir-theme')).toBe('dark');

    // Click again to return to light mode
    await user.click(toggleButton);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('bir-theme')).toBe('light');
  });

  it('initializes in dark mode if localStorage has dark saved', () => {
    localStorage.setItem('bir-theme', 'dark');
    render(<ThemeToggle />);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
