import { render } from '@testing-library/react';
import LandingPage from '@/app/page';
import LoginPage from '@/app/login/page';
import RegisterPage from '@/app/register/page';
import FreeConfigPage from '@/app/free/page';
import ProfilePage from '@/app/profile/page';
import AdminUsersPage from '@/app/admin/users/page';
import ReviewPage from '@/app/revisiones/page';
import QuestionDuplicatesPage from '@/app/questions/duplicates/page';
import QuestionImportPage from '@/app/questions/import/page';
import RootLayout from '@/app/layout';
import { auth } from '@/auth';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
  redirect: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  signIn: jest.fn(),
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

const mockAuth = auth as jest.Mock;

describe('Design System Consistency & Dark Theme Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies dark theme background and card surface classes to LandingPage', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const element = await LandingPage();
    const { container } = render(element);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);
    expect(rootWrapper.className).toMatch(/dark:text-slate-100/);

    const heroCard = container.querySelector('section');
    expect(heroCard).not.toBeNull();
    expect(heroCard?.className).toMatch(/dark:bg-slate-900/);
    expect(heroCard?.className).toMatch(/dark:border-slate-800/);
  });

  it('applies dark theme background and card surface classes to LoginPage', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const element = await LoginPage({});
    const { container } = render(element);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);

    const card = container.querySelector('main > div');
    expect(card).not.toBeNull();
    expect(card?.className).toMatch(/dark:bg-slate-900/);
    expect(card?.className).toMatch(/dark:border-slate-800/);
  });

  it('applies dark theme background and card surface classes to RegisterPage', () => {
    const { container } = render(<RegisterPage />);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);

    const card = container.querySelector('main > div');
    expect(card).not.toBeNull();
    expect(card?.className).toMatch(/dark:bg-slate-950|dark:bg-slate-900/);
    expect(card?.className).toMatch(/dark:border-slate-800/);
  });

  it('applies dark theme classes to FreeConfigPage wrapper', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { name: 'student', role: 'USER', accessToken: 'mock-token' },
    });
    // mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const element = await FreeConfigPage();
    const { container } = render(element!);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);
  });

  it('applies dark theme classes to ProfilePage wrapper and card', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { name: 'Dr. Test', role: 'ADMIN', accessToken: 'mock-token' },
    });

    const element = await ProfilePage();
    const { container } = render(element!);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);

    const headerCard = container.querySelector('.rounded-2xl');
    expect(headerCard?.className).toMatch(/dark:bg-slate-900/);
    expect(headerCard?.className).toMatch(/dark:border-slate-800/);
  });

  it('applies dark theme classes to AdminUsersPage', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { name: 'admin', role: 'ADMIN', accessToken: 'mock-token' },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const element = await AdminUsersPage();
    const { container } = render(element!);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);
    expect(rootWrapper.className).toMatch(/dark:text-slate-100/);
  });

  it('applies dark theme classes to ReviewPage', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { name: 'admin', role: 'ADMIN', accessToken: 'mock-token' },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const element = await ReviewPage({});
    const { container } = render(element!);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.className).toMatch(/dark:bg-slate-950/);
    expect(rootWrapper.className).toMatch(/dark:text-slate-100/);
  });

  it('applies dark theme classes to QuestionImportPage and QuestionDuplicatesPage', async () => {
    mockAuth.mockResolvedValue({
      user: { name: 'admin', role: 'ADMIN', accessToken: 'mock-token' },
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const importElement = await QuestionImportPage();
    const { container: importContainer } = render(importElement!);
    const importWrapper = importContainer.firstChild as HTMLElement;
    expect(importWrapper.className).toMatch(/dark:bg-slate-950/);

    const dupElement = await QuestionDuplicatesPage({});
    const { container: dupContainer } = render(dupElement!);
    const dupWrapper = dupContainer.firstChild as HTMLElement;
    expect(dupWrapper.className).toMatch(/dark:bg-slate-950/);
  });

  it('renders RootLayout with suppressHydrationWarning on both html and body tags', () => {
    const element = RootLayout({ children: <div data-testid="child">Test</div> });
    expect(element.props.suppressHydrationWarning).toBe(true);

    const children = Array.isArray(element.props.children)
      ? element.props.children
      : [element.props.children];
    const body = children.find((c: any) => c?.type === 'body');
    expect(body).toBeDefined();
    expect(body?.props.suppressHydrationWarning).toBe(true);
  });
});
