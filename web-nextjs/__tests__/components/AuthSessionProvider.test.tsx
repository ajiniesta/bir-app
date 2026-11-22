import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import AuthSessionProvider from "@/app/components/AuthSessionProvider";

const mockPush = jest.fn();
const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => "/free",
}));

const mockSignOut = jest.fn();
const mockUseSession = jest.fn();
jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => mockUseSession(),
}));

describe("AuthSessionProvider (automatic client logout synchronized with API)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSignOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it("automatically logs out when the API token expiration time is reached", async () => {
    const expiresAt = Date.now() + 5000;
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          name: "admin",
          role: "ADMIN",
          accessToken: "valid-token",
          accessTokenExpires: expiresAt,
        },
        expires: new Date(expiresAt).toISOString(),
      },
    });

    render(
      <AuthSessionProvider>
        <div>Contenido protegido</div>
      </AuthSessionProvider>
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    expect(mockSignOut).not.toHaveBeenCalled();

    // Advance time to the API token expiration moment
    await act(async () => {
      jest.advanceTimersByTime(5100);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("immediately logs out if the session has an already-expired API token", async () => {
    const expiredAt = Date.now() - 1000;
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          name: "demo",
          role: "CREATOR",
          accessToken: "expired-token",
          accessTokenExpires: expiredAt,
        },
        expires: new Date(expiredAt).toISOString(),
      },
    });

    render(
      <AuthSessionProvider>
        <div>Contenido</div>
      </AuthSessionProvider>
    );

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("automatically logs out when a client fetch to /api/... receives 401 Unauthorized from the backend API", async () => {
    const expiresAt = Date.now() + 60_000;
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          name: "admin",
          role: "ADMIN",
          accessToken: "revoked-or-expired-token",
          accessTokenExpires: expiresAt,
        },
        expires: new Date(expiresAt).toISOString(),
      },
    });

    const underlyingFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });
    global.fetch = underlyingFetch;

    render(
      <AuthSessionProvider>
        <div>App</div>
      </AuthSessionProvider>
    );

    await act(async () => {
      await window.fetch("/api/free-sessions", {
        method: "POST",
        headers: { Authorization: "Bearer revoked-or-expired-token" },
      });
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("does NOT trigger auto-logout when /api/auth/login returns 401 for wrong credentials", async () => {
    mockUseSession.mockReturnValue({
      status: "unauthenticated",
      data: null,
    });

    const underlyingFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });
    global.fetch = underlyingFetch;

    render(
      <AuthSessionProvider>
        <div>Login</div>
      </AuthSessionProvider>
    );

    await act(async () => {
      await window.fetch("/api/auth/login", {
        method: "POST",
      });
    });

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
