import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import GlobalTopProgress from "@/app/components/GlobalTopProgress";
import AuthSessionProvider from "@/app/components/AuthSessionProvider";
import {
  getHeaderValue,
  shouldTrackFetchRequest,
  getInternalNavigationTarget,
  SHOW_DELAY_MS,
  SPINNER_DELAY_MS,
  COMPLETE_HOLD_MS,
} from "@/app/lib/progressTracker";

let mockPathname = "/questions";
let mockSearchParams = new URLSearchParams("");
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

const mockSignOut = jest.fn();
const mockUseSession = jest.fn();
jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  signOut: (...args: unknown[]) => mockSignOut(...args),
  useSession: () => mockUseSession(),
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("progressTracker pure utilities", () => {
  it("reads header values case-insensitively from Headers, tuples, and plain objects", () => {
    const hInstance = new Headers({ "Next-Router-Prefetch": "1" });
    expect(getHeaderValue(hInstance, "next-router-prefetch")).toBe("1");

    const tupleHeaders: [string, string][] = [["RSC", "1"]];
    expect(getHeaderValue(tupleHeaders, "rsc")).toBe("1");

    const recordHeaders = { "X-Skip-Global-Progress": "true" };
    expect(getHeaderValue(recordHeaders, "x-skip-global-progress")).toBe("true");
    expect(getHeaderValue(undefined, "rsc")).toBeNull();
  });

  it("tracks API requests and real RSC navigations while excluding prefetches, auth polling, and batch endpoints", () => {
    // Tracked client API calls
    expect(shouldTrackFetchRequest("/api/stats/overview")).toBe(true);
    expect(shouldTrackFetchRequest("/api/free-sessions", { method: "POST" })).toBe(true);
    expect(shouldTrackFetchRequest("/api/auth/login", { method: "POST" })).toBe(true);
    expect(shouldTrackFetchRequest("/api/auth/register", { method: "POST" })).toBe(true);

    // Tracked non-prefetch Next.js RSC / Server Action requests
    expect(shouldTrackFetchRequest("/estadisticas?_rsc=1a2b", { headers: { rsc: "1" } })).toBe(true);
    expect(shouldTrackFetchRequest("/questions", { headers: { "next-action": "act123" } })).toBe(true);

    // Excluded silent NextAuth polling endpoints
    expect(shouldTrackFetchRequest("/api/auth/session")).toBe(false);
    expect(shouldTrackFetchRequest("/api/auth/providers")).toBe(false);
    expect(shouldTrackFetchRequest("/api/auth/csrf")).toBe(false);
    expect(shouldTrackFetchRequest("/api/auth/_log", { method: "POST" })).toBe(false);

    // Excluded batched operations with dedicated progress UI
    expect(shouldTrackFetchRequest("/api/questions/import", { method: "POST" })).toBe(false);
    expect(shouldTrackFetchRequest("/api/questions/duplicates/purge", { method: "POST" })).toBe(false);

    // Excluded Next.js background prefetches, HMR, and explicit opt-out header
    expect(
      shouldTrackFetchRequest("/estadisticas?_rsc=1a2b", {
        headers: { rsc: "1", "next-router-prefetch": "1" },
      })
    ).toBe(false);
    expect(
      shouldTrackFetchRequest("/estadisticas?_rsc=1a2b", {
        headers: { rsc: "1", "next-router-segment-prefetch": "/_tree" },
      })
    ).toBe(false);
    expect(
      shouldTrackFetchRequest("/estadisticas?_rsc=1a2b", {
        headers: { rsc: "1", "next-hmr-refresh": "1" },
      })
    ).toBe(false);
    expect(
      shouldTrackFetchRequest("/api/stats/overview", {
        headers: { "x-skip-global-progress": "1" },
      })
    ).toBe(false);
  });

  it("identifies valid internal navigation link clicks vs non-navigating clicks", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <a id="internal" href="/estadisticas">Estadísticas</a>
      <a id="same" href="/questions">Misma ruta</a>
      <a id="blank" href="/simulacros" target="_blank">Nueva pestaña</a>
      <a id="download" href="/export.json" download>Descargar</a>
      <a id="hash" href="#top">Ancla</a>
      <a id="external" href="https://example.org/docs">Externo</a>
    `;
    document.body.appendChild(container);

    const fakeLocation = new URL("http://localhost/questions") as unknown as Location;

    const makeClick = (el: HTMLElement, init?: MouseEventInit) => {
      const ev = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ...init });
      Object.defineProperty(ev, "target", { value: el });
      return ev;
    };

    expect(getInternalNavigationTarget(makeClick(document.getElementById("internal")!), fakeLocation)).toBe(
      "/estadisticas"
    );
    expect(getInternalNavigationTarget(makeClick(document.getElementById("same")!), fakeLocation)).toBeNull();
    expect(getInternalNavigationTarget(makeClick(document.getElementById("blank")!), fakeLocation)).toBeNull();
    expect(getInternalNavigationTarget(makeClick(document.getElementById("download")!), fakeLocation)).toBeNull();
    expect(getInternalNavigationTarget(makeClick(document.getElementById("hash")!), fakeLocation)).toBeNull();
    expect(getInternalNavigationTarget(makeClick(document.getElementById("external")!), fakeLocation)).toBeNull();
    expect(
      getInternalNavigationTarget(
        makeClick(document.getElementById("internal")!, { ctrlKey: true }),
        fakeLocation
      )
    ).toBeNull();

    document.body.removeChild(container);
  });
});

describe("GlobalTopProgress component", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPathname = "/questions";
    mockSearchParams = new URLSearchParams("");
    mockSignOut.mockResolvedValue(undefined);
    mockUseSession.mockReturnValue({ status: "unauthenticated", data: null });
    window.history.replaceState(null, "", "/questions");
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it("does NOT show progress bar when an API call completes faster than the anti-flicker threshold", async () => {
    const deferred = createDeferred<Response>();
    global.fetch = jest.fn(() => deferred.promise);

    render(<GlobalTopProgress />);

    let fetchPromise!: Promise<Response>;
    act(() => {
      fetchPromise = window.fetch("/api/stats/overview");
    });

    // Advance less than SHOW_DELAY_MS (180ms)
    act(() => {
      jest.advanceTimersByTime(80);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Resolve quickly before threshold
    await act(async () => {
      deferred.resolve({ ok: true, status: 200 } as Response);
      await fetchPromise;
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("shows non-blocking top progress bar after 180ms, spinner after 500ms, trickles, and completes cleanly on slow API calls", async () => {
    const deferred = createDeferred<Response>();
    global.fetch = jest.fn(() => deferred.promise);

    render(<GlobalTopProgress />);

    let fetchPromise!: Promise<Response>;
    act(() => {
      fetchPromise = window.fetch("/api/stats/overview");
    });

    // Before 180ms -> hidden
    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS - 30);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // Cross 180ms -> top bar appears, non-blocking & print:hidden, spinner not yet visible
    act(() => {
      jest.advanceTimersByTime(40);
    });
    const bar = screen.getByRole("progressbar", { name: /cargando/i });
    expect(bar).toBeInTheDocument();
    expect(bar.className).toMatch(/pointer-events-none/);
    expect(bar.className).toMatch(/print:hidden/);
    const initialVal = Number(bar.getAttribute("aria-valuenow"));
    expect(initialVal).toBeGreaterThanOrEqual(15);
    expect(screen.queryByTestId("global-progress-spinner")).not.toBeInTheDocument();

    // Cross 500ms -> progress trickles forward and discrete top-right spinner appears
    act(() => {
      jest.advanceTimersByTime(SPINNER_DELAY_MS);
    });
    const midVal = Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"));
    expect(midVal).toBeGreaterThan(initialVal);
    expect(midVal).toBeLessThanOrEqual(92);
    expect(screen.getByTestId("global-progress-spinner")).toBeInTheDocument();

    // Resolve slow API call -> jumps to 100% then fades out after COMPLETE_HOLD_MS
    await act(async () => {
      deferred.resolve({ ok: true, status: 200 } as Response);
      await fetchPromise;
    });

    expect(Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"))).toBe(100);

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("global-progress-spinner")).not.toBeInTheDocument();
  });

  it("cleans up and hides the progress bar even when fetch rejects with a network error", async () => {
    const deferred = createDeferred<Response>();
    global.fetch = jest.fn(() => deferred.promise);

    render(<GlobalTopProgress />);

    let caughtError: unknown = null;
    act(() => {
      window.fetch("/api/questions/page").catch((err) => {
        caughtError = err;
      });
    });

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS + 50);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await act(async () => {
      deferred.reject(new Error("Network down"));
      await Promise.resolve();
    });

    expect(caughtError).toBeInstanceOf(Error);

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("stays active while concurrent API requests are still in flight", async () => {
    const req1 = createDeferred<Response>();
    const req2 = createDeferred<Response>();
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => req1.promise)
      .mockImplementationOnce(() => req2.promise);

    render(<GlobalTopProgress />);

    let p1!: Promise<Response>;
    let p2!: Promise<Response>;
    act(() => {
      p1 = window.fetch("/api/exam-types");
      p2 = window.fetch("/api/tags");
    });

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS + 40);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    // Finish first request -> bar must remain active (< 100%)
    await act(async () => {
      req1.resolve({ ok: true, status: 200 } as Response);
      await p1;
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(Number(screen.getByRole("progressbar").getAttribute("aria-valuenow"))).toBeLessThan(100);

    // Finish second request -> completes and hides
    await act(async () => {
      req2.resolve({ ok: true, status: 200 } as Response);
      await p2;
    });

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("ignores excluded endpoints (/api/auth/session, import, duplicates purge) and Next.js background prefetches", () => {
    const neverResolves = new Promise<Response>(() => {});
    global.fetch = jest.fn(() => neverResolves);

    render(<GlobalTopProgress />);

    act(() => {
      void window.fetch("/api/auth/session");
      void window.fetch("/api/questions/import", { method: "POST" });
      void window.fetch("/api/questions/duplicates/purge", { method: "POST" });
      void window.fetch("/estadisticas?_rsc=xyz", {
        headers: { rsc: "1", "next-router-prefetch": "1" },
      });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  /* eslint-disable @next/next/no-html-link-for-pages */
  it("activates on slow internal route link clicks and finishes when pathname or searchParams commit", () => {
    const preventNativeNav = (e: React.MouseEvent) => e.preventDefault();
    const ui = () => (
      <>
        <GlobalTopProgress />
        <a href="/estadisticas" onClick={preventNativeNav}>
          Ir a estadísticas
        </a>
        <a href="/questions?page=2" onClick={preventNativeNav}>
          Página 2
        </a>
      </>
    );

    const { rerender } = render(ui());

    // 1. Navigate to a different pathname (/estadisticas)
    fireEvent.click(screen.getByText("Ir a estadísticas"));

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS + 30);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(SPINNER_DELAY_MS);
    });
    expect(screen.getByTestId("global-progress-spinner")).toBeInTheDocument();

    // Simulate Next.js committing the new route
    mockPathname = "/estadisticas";
    window.history.pushState(null, "", "/estadisticas");
    rerender(ui());

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();

    // 2. Navigate by query string (?page=2)
    mockPathname = "/questions";
    window.history.replaceState(null, "", "/questions");
    rerender(ui());

    fireEvent.click(screen.getByText("Página 2"));
    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS + 30);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    mockSearchParams = new URLSearchParams("page=2");
    window.history.pushState(null, "", "/questions?page=2");
    rerender(ui());

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  /* eslint-enable @next/next/no-html-link-for-pages */

  it("coexists seamlessly with AuthSessionProvider on slow 401 responses", async () => {
    const expiresAt = Date.now() + 60_000;
    mockUseSession.mockReturnValue({
      status: "authenticated",
      data: {
        user: {
          name: "admin",
          role: "ADMIN",
          accessToken: "revoked-token",
          accessTokenExpires: expiresAt,
        },
        expires: new Date(expiresAt).toISOString(),
      },
    });

    const deferred = createDeferred<Response>();
    global.fetch = jest.fn(() => deferred.promise);

    render(
      <AuthSessionProvider>
        <GlobalTopProgress />
        <div>Vista protegida</div>
      </AuthSessionProvider>
    );

    let reqPromise!: Promise<Response>;
    act(() => {
      reqPromise = window.fetch("/api/free-sessions", {
        method: "POST",
        headers: { Authorization: "Bearer revoked-token" },
      });
    });

    act(() => {
      jest.advanceTimersByTime(SHOW_DELAY_MS + 50);
    });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();

    await act(async () => {
      deferred.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: "Unauthorized" }),
      } as Response);
      await reqPromise;
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith({ redirect: false });
      expect(mockPush).toHaveBeenCalledWith("/login");
    });

    act(() => {
      jest.advanceTimersByTime(COMPLETE_HOLD_MS + 50);
    });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
