jest.mock("next-auth", () => ({
  __esModule: true,
  default: jest.fn((config) => ({
    handlers: {},
    signIn: jest.fn(),
    signOut: jest.fn(),
    auth: jest.fn(),
    config,
  })),
}));

jest.mock("next-auth/providers/credentials", () => ({
  __esModule: true,
  default: jest.fn((config) => config),
}));

import {
  extractJwtExpirationMs,
  resolveAccessTokenExpiresMs,
  isAccessTokenExpired,
  authConfig,
} from "@/auth";

function createFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.fake-signature`;
}

describe("NextAuth & API JWT Expiration Synchronization", () => {
  it("extracts the exact exp claim (in ms) from a Micronaut JWT access_token", () => {
    const expSeconds = 1800000000;
    const jwt = createFakeJwt({
      sub: "admin",
      roles: ["ROLE_ADMIN"],
      exp: expSeconds,
    });

    expect(extractJwtExpirationMs(jwt)).toBe(expSeconds * 1000);
  });

  it("falls back to expires_in when access_token does not carry a JWT exp claim", () => {
    const now = 1700000000000;
    const expiresMs = resolveAccessTokenExpiresMs("opaque-token", 3600, now);

    expect(expiresMs).toBe(now + 3600 * 1000);
  });

  it("detects when an API accessToken is expired via accessTokenExpires or embedded JWT exp", () => {
    const now = 1700000000000;
    const expiredJwt = createFakeJwt({ sub: "demo", exp: Math.floor((now - 5000) / 1000) });
    const validJwt = createFakeJwt({ sub: "demo", exp: Math.floor((now + 60000) / 1000) });

    expect(isAccessTokenExpired(now - 1, validJwt, now)).toBe(true);
    expect(isAccessTokenExpired(undefined, expiredJwt, now)).toBe(true);
    expect(isAccessTokenExpired(undefined, validJwt, now)).toBe(false);
    expect(isAccessTokenExpired(now + 60000, validJwt, now)).toBe(false);
  });

  it("jwt callback stores accessTokenExpires on sign-in and returns null once the API token expires", async () => {
    const futureExpSeconds = Math.floor((Date.now() + 60_000) / 1000);
    const validJwt = createFakeJwt({ sub: "admin", roles: ["ROLE_ADMIN"], exp: futureExpSeconds });

    const jwtCallback = authConfig.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    // 1. Initial sign-in populates accessTokenExpires synchronized with the API JWT exp
    const initialToken = await jwtCallback!({
      token: { name: "admin", sub: "admin" },
      user: {
        id: "admin",
        name: "admin",
        accessToken: validJwt,
        roles: ["ROLE_ADMIN"],
        role: "ADMIN",
      } as never,
      account: null,
      trigger: "signIn",
    });

    expect(initialToken).not.toBeNull();
    expect(initialToken?.accessToken).toBe(validJwt);
    expect(initialToken?.accessTokenExpires).toBe(futureExpSeconds * 1000);

    // 2. Subsequent check after API token has expired returns null (invalidating NextAuth session)
    const expiredTokenResult = await jwtCallback!({
      token: {
        ...initialToken,
        accessTokenExpires: Date.now() - 1000,
      },
      user: undefined as never,
      account: null,
    });

    expect(expiredTokenResult).toBeNull();
  });

  it("jwt callback invalidates legacy session cookies whose embedded JWT exp has passed even without accessTokenExpires", async () => {
    const pastExpSeconds = Math.floor((Date.now() - 10_000) / 1000);
    const expiredJwt = createFakeJwt({ sub: "admin", roles: ["ROLE_ADMIN"], exp: pastExpSeconds });

    const jwtCallback = authConfig.callbacks?.jwt;
    const result = await jwtCallback!({
      token: {
        name: "admin",
        sub: "admin",
        accessToken: expiredJwt,
        role: "ADMIN",
        roles: ["ROLE_ADMIN"],
      },
      user: undefined as never,
      account: null,
    });

    expect(result).toBeNull();
  });

  it("session callback synchronizes session.expires with API token expiration and returns null if expired", async () => {
    const futureMs = Date.now() + 120_000;
    const validJwt = createFakeJwt({ sub: "demo", exp: Math.floor(futureMs / 1000) });

    const sessionCallback = authConfig.callbacks?.session;
    expect(sessionCallback).toBeDefined();

    const activeSession = await sessionCallback!({
      session: {
        user: { name: "demo", email: "", image: "" },
        expires: new Date(Date.now() + 30 * 86400 * 1000).toISOString() as never,
      },
      token: {
        name: "demo",
        accessToken: validJwt,
        accessTokenExpires: futureMs,
        role: "CREATOR",
        roles: ["ROLE_CREATOR"],
      },
    } as never);

    expect(activeSession).not.toBeNull();
    expect(activeSession.expires).toBe(new Date(futureMs).toISOString());
    expect((activeSession.user as unknown as { accessTokenExpires?: number }).accessTokenExpires).toBe(
      futureMs
    );

    const expiredSession = await sessionCallback!({
      session: {
        user: { name: "demo", email: "", image: "" },
        expires: new Date(Date.now() + 30 * 86400 * 1000).toISOString() as never,
      },
      token: {
        name: "demo",
        accessToken: validJwt,
        accessTokenExpires: Date.now() - 1000,
        role: "CREATOR",
        roles: ["ROLE_CREATOR"],
      },
    } as never);

    expect(expiredSession).toBeNull();
  });
});
