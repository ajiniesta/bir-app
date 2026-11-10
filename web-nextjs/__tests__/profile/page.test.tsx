import { render, screen } from '@testing-library/react';
import ProfilePage from '@/app/profile/page';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/profile',
  redirect: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

describe('ProfilePage (/profile)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when user is not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);

    await ProfilePage();

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  it('renders user profile details when authenticated', async () => {
    mockAuth.mockResolvedValueOnce({
      user: {
        name: 'juan_perez',
        role: 'ADMIN',
      },
    });

    const pageElement = await ProfilePage();
    render(pageElement);

    expect(screen.getByRole('heading', { name: /perfil de usuario/i })).toBeInTheDocument();
    expect(screen.getAllByText('juan_perez').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/admin/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/próximamente/i)).toBeInTheDocument();
  });
});
