"use client";

import { useEffect, useRef, useCallback } from "react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { extractJwtExpirationMs } from "@/app/lib/tokenExpiration";

const MAX_TIMEOUT_MS = 2_147_483_647; // Max 32-bit signed integer for setTimeout

interface SessionWithApiToken {
  user?: {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
    accessTokenExpires?: number;
  };
  expires?: string;
}

function getSessionExpirationMs(session?: SessionWithApiToken | null): number | null {
  if (!session?.user) {
    return null;
  }

  if (
    typeof session.user.accessTokenExpires === "number" &&
    Number.isFinite(session.user.accessTokenExpires)
  ) {
    return session.user.accessTokenExpires;
  }

  const jwtExp = extractJwtExpirationMs(session.user.accessToken);
  if (jwtExp !== null) {
    return jwtExp;
  }

  if (session.expires) {
    const parsed = Date.parse(session.expires);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isProtectedApiRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  let urlStr = "";
  if (typeof input === "string") {
    urlStr = input;
  } else if (typeof URL !== "undefined" && input instanceof URL) {
    urlStr = input.toString();
  } else if (input && typeof input === "object" && "url" in input) {
    urlStr = String((input as { url: unknown }).url);
  }

  // Exclude public/auth endpoints (e.g., /api/auth/login, /api/auth/register, NextAuth routes)
  if (/\/api\/auth(\/|$|\?)/.test(urlStr) || /\/login(\/|$|\?)/.test(urlStr)) {
    return false;
  }

  if (urlStr.startsWith("/api/") || urlStr.includes("/api/")) {
    return true;
  }

  if (init?.headers) {
    const headers = init.headers;
    if (headers instanceof Headers) {
      return Boolean(headers.get("Authorization") || headers.get("authorization"));
    }
    if (Array.isArray(headers)) {
      return headers.some(([k]) => k.toLowerCase() === "authorization");
    }
    const record = headers as Record<string, string>;
    return Boolean(record.Authorization || record.authorization);
  }

  return false;
}

function SessionAutoLogoutGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const sessionState = useSession?.();
  const session = (sessionState?.data as SessionWithApiToken | null | undefined) ?? null;
  const status = sessionState?.status;
  const isLoggingOutRef = useRef(false);

  const performAutoLogout = useCallback(async () => {
    if (isLoggingOutRef.current) {
      return;
    }
    isLoggingOutRef.current = true;
    try {
      await signOut({ redirect: false });
      router?.push?.("/login");
      router?.refresh?.();
    } finally {
      isLoggingOutRef.current = false;
    }
  }, [router]);

  // 1. Synchronize automatic logout with API token expiration time
  useEffect(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    const expiresAtMs = getSessionExpirationMs(session);
    if (expiresAtMs === null) {
      return;
    }

    const remainingMs = expiresAtMs - Date.now();
    if (remainingMs <= 0) {
      void performAutoLogout();
      return;
    }

    const timeoutDelay = Math.min(remainingMs, MAX_TIMEOUT_MS);
    const timerId = setTimeout(() => {
      if (Date.now() >= expiresAtMs) {
        void performAutoLogout();
      }
    }, timeoutDelay);

    const checkExpirationOnResume = () => {
      if (Date.now() >= expiresAtMs) {
        void performAutoLogout();
      }
    };

    window.addEventListener("focus", checkExpirationOnResume);
    document.addEventListener("visibilitychange", checkExpirationOnResume);

    return () => {
      clearTimeout(timerId);
      window.removeEventListener("focus", checkExpirationOnResume);
      document.removeEventListener("visibilitychange", checkExpirationOnResume);
    };
  }, [status, session, performAutoLogout]);

  // 2. Intercept 401 Unauthorized responses from the backend API proxy
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }

    const originalFetch = window.fetch;

    const wrappedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);
      if (response && response.status === 401 && isProtectedApiRequest(input, init)) {
        void performAutoLogout();
      }
      return response;
    };

    window.fetch = wrappedFetch;

    return () => {
      if (window.fetch === wrappedFetch) {
        window.fetch = originalFetch;
      }
    };
  }, [performAutoLogout]);

  return <>{children}</>;
}

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus={true}>
      <SessionAutoLogoutGuard>{children}</SessionAutoLogoutGuard>
    </SessionProvider>
  );
}
