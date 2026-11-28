export const SHOW_DELAY_MS = 180;
export const SPINNER_DELAY_MS = 500;
export const TRICKLE_INTERVAL_MS = 250;
export const COMPLETE_HOLD_MS = 220;
export const NAVIGATION_SAFETY_TIMEOUT_MS = 25_000;

export function getHeaderValue(
  headers: HeadersInit | undefined,
  name: string
): string | null {
  if (!headers) {
    return null;
  }

  const lower = name.toLowerCase();

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? headers.get(lower);
  }

  if (Array.isArray(headers)) {
    const found = headers.find(([key]) => key.toLowerCase() === lower);
    return found ? found[1] : null;
  }

  const record = headers as Record<string, string>;
  for (const [key, value] of Object.entries(record)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }

  return null;
}

function readRequestHeader(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  name: string
): string | null {
  const fromInit = getHeaderValue(init?.headers, name);
  if (fromInit !== null) {
    return fromInit;
  }

  if (
    input &&
    typeof input === "object" &&
    "headers" in input &&
    input.headers
  ) {
    return getHeaderValue(input.headers as HeadersInit, name);
  }

  return null;
}

function extractUrlString(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (typeof URL !== "undefined" && input instanceof URL) {
    return input.toString();
  }
  if (input && typeof input === "object" && "url" in input) {
    return String((input as { url: unknown }).url);
  }
  return "";
}

export function shouldTrackFetchRequest(
  input: RequestInfo | URL,
  init?: RequestInit
): boolean {
  const skipHeader = readRequestHeader(input, init, "x-skip-global-progress");
  if (
    skipHeader &&
    skipHeader !== "0" &&
    skipHeader.toLowerCase() !== "false"
  ) {
    return false;
  }

  // Ignore Next.js background prefetches and dev HMR refreshes
  if (
    readRequestHeader(input, init, "next-router-prefetch") !== null ||
    readRequestHeader(input, init, "next-router-segment-prefetch") !== null ||
    readRequestHeader(input, init, "next-hmr-refresh") !== null
  ) {
    return false;
  }

  const urlStr = extractUrlString(input);
  if (!urlStr) {
    return false;
  }

  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";

  let parsed: URL;
  try {
    parsed = new URL(urlStr, baseOrigin);
  } catch {
    return false;
  }

  // Ignore cross-origin requests when an absolute URL is passed
  if (/^https?:\/\//i.test(urlStr) && parsed.origin !== baseOrigin) {
    return false;
  }

  const { pathname, searchParams } = parsed;

  // Ignore silent NextAuth session polling/internal endpoints
  if (/^\/api\/auth\/(session|providers|csrf|_log)(\/|$)/.test(pathname)) {
    return false;
  }

  // Ignore batched operations that render their own dedicated progress bar
  if (
    pathname === "/api/questions/import" ||
    pathname === "/api/questions/duplicates/purge"
  ) {
    return false;
  }

  // Track client calls to backend API proxy
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return true;
  }

  // Track real Next.js App Router RSC navigations and Server Actions
  if (
    readRequestHeader(input, init, "rsc") === "1" ||
    Boolean(readRequestHeader(input, init, "next-action")) ||
    searchParams.has("_rsc")
  ) {
    return true;
  }

  return false;
}

export function getInternalNavigationTarget(
  event: MouseEvent,
  currentLocation: Pick<Location, "href" | "origin" | "pathname" | "search">
): string | null {
  if (event.defaultPrevented) {
    return null;
  }
  if (event.button !== 0) {
    return null;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return null;
  }

  const target = event.target;
  if (!target || typeof (target as Element).closest !== "function") {
    return null;
  }

  const anchor = (target as Element).closest("a");
  if (!anchor) {
    return null;
  }

  if (anchor.hasAttribute("download")) {
    return null;
  }

  const linkTarget = anchor.getAttribute("target");
  if (linkTarget && linkTarget !== "_self") {
    return null;
  }

  const rawHref = anchor.getAttribute("href");
  if (
    !rawHref ||
    rawHref.startsWith("#") ||
    /^(mailto:|tel:|javascript:|blob:|data:)/i.test(rawHref)
  ) {
    return null;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawHref, currentLocation.href);
  } catch {
    return null;
  }

  if (targetUrl.origin !== currentLocation.origin) {
    return null;
  }

  const nextRoute = `${targetUrl.pathname}${targetUrl.search}`;
  const currentRoute = `${currentLocation.pathname}${currentLocation.search}`;

  if (nextRoute === currentRoute) {
    return null;
  }

  return nextRoute;
}
