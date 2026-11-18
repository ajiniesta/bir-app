export const DEFAULT_API_TOKEN_MAX_AGE_SECONDS = 86400; // 24h (matches micronaut.security.token.generator.access-token.expiration)

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    if (typeof Buffer !== "undefined") {
      return Buffer.from(padded, "base64").toString("utf-8");
    }
    if (typeof atob === "function") {
      return atob(padded);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts the `exp` claim (in milliseconds since Unix epoch) from a standard
 * 3-part JWT (`header.payload.signature`) issued by the Micronaut API.
 */
export function extractJwtExpirationMs(accessToken?: string | null): number | null {
  if (!accessToken || typeof accessToken !== "string") {
    return null;
  }

  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const decodedPayload = decodeBase64Url(parts[1]);
  if (!decodedPayload) {
    return null;
  }

  try {
    const payload = JSON.parse(decodedPayload) as { exp?: unknown };
    if (typeof payload?.exp === "number" && Number.isFinite(payload.exp) && payload.exp > 0) {
      return payload.exp * 1000;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolves the exact expiration timestamp (in milliseconds) of an API access token,
 * prioritizing its embedded JWT `exp` claim, then the `expires_in` response field,
 * and finally defaulting to 24 hours (86400s).
 */
export function resolveAccessTokenExpiresMs(
  accessToken?: string | null,
  expiresInSeconds?: number | null,
  nowMs: number = Date.now()
): number {
  const jwtExpMs = extractJwtExpirationMs(accessToken);
  if (jwtExpMs !== null) {
    return jwtExpMs;
  }

  if (
    typeof expiresInSeconds === "number" &&
    Number.isFinite(expiresInSeconds) &&
    expiresInSeconds > 0
  ) {
    return nowMs + expiresInSeconds * 1000;
  }

  return nowMs + DEFAULT_API_TOKEN_MAX_AGE_SECONDS * 1000;
}

/**
 * Checks whether the API access token has expired at `nowMs`.
 */
export function isAccessTokenExpired(
  accessTokenExpires?: number | null,
  accessToken?: string | null,
  nowMs: number = Date.now()
): boolean {
  if (!accessToken && typeof accessTokenExpires !== "number") {
    return true;
  }

  const resolvedExpires =
    typeof accessTokenExpires === "number" && Number.isFinite(accessTokenExpires)
      ? accessTokenExpires
      : extractJwtExpirationMs(accessToken);

  if (typeof resolvedExpires === "number") {
    return nowMs >= resolvedExpires;
  }

  return false;
}
