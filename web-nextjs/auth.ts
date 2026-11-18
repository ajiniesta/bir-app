import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  DEFAULT_API_TOKEN_MAX_AGE_SECONDS,
  extractJwtExpirationMs,
  resolveAccessTokenExpiresMs,
  isAccessTokenExpired,
} from "./app/lib/tokenExpiration";

export {
  DEFAULT_API_TOKEN_MAX_AGE_SECONDS,
  extractJwtExpirationMs,
  resolveAccessTokenExpiresMs,
  isAccessTokenExpired,
};

export const authConfig: NextAuthConfig = {
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "bir-app-dev-secret-key-change-in-prod",
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: DEFAULT_API_TOKEN_MAX_AGE_SECONDS,
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
        try {
          const res = await fetch(`${apiBaseUrl}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json();
          if (!data?.access_token) {
            return null;
          }

          const accessTokenExpires = resolveAccessTokenExpiresMs(
            data.access_token,
            typeof data.expires_in === "number" ? data.expires_in : undefined
          );

          if (isAccessTokenExpired(accessTokenExpires, data.access_token)) {
            return null;
          }

          const role =
            data.roles
              ?.find((r: string) => r.startsWith("ROLE_"))
              ?.replace("ROLE_", "") || "USER";

          return {
            id: data.username,
            name: data.username,
            accessToken: data.access_token,
            accessTokenExpires,
            roles: data.roles,
            role,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const typedUser = user as {
          accessToken?: string;
          accessTokenExpires?: number;
          expiresIn?: number;
          roles?: string[];
          role?: string;
        };
        token.accessToken = typedUser.accessToken;
        token.accessTokenExpires =
          typeof typedUser.accessTokenExpires === "number"
            ? typedUser.accessTokenExpires
            : resolveAccessTokenExpiresMs(
                typedUser.accessToken,
                typedUser.expiresIn
              );
        token.roles = typedUser.roles;
        token.role = typedUser.role;
      }

      if (
        typeof token.accessTokenExpires !== "number" &&
        typeof token.accessToken === "string"
      ) {
        const extractedExp = extractJwtExpirationMs(token.accessToken);
        if (extractedExp !== null) {
          token.accessTokenExpires = extractedExp;
        }
      }

      if (
        isAccessTokenExpired(
          token.accessTokenExpires as number | undefined,
          token.accessToken as string | undefined
        )
      ) {
        return null;
      }

      return token;
    },
    session({ session, token }) {
      if (
        !token ||
        isAccessTokenExpired(
          token.accessTokenExpires as number | undefined,
          token.accessToken as string | undefined
        )
      ) {
        return null as unknown as typeof session;
      }

      if (session.user) {
        const sessionUser = session.user as unknown as {
          accessToken?: string;
          accessTokenExpires?: number;
          roles?: string[];
          role?: string;
        };
        sessionUser.accessToken = token.accessToken as string;
        sessionUser.accessTokenExpires = token.accessTokenExpires as
          | number
          | undefined;
        sessionUser.roles = token.roles as string[];
        sessionUser.role = token.role as string;
      }

      if (typeof token.accessTokenExpires === "number") {
        session.expires = new Date(
          token.accessTokenExpires
        ).toISOString() as typeof session.expires;
      }

      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
