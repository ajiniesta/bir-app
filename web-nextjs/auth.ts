import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "bir-app-dev-secret-key-change-in-prod",
  trustHost: true,
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
          const role =
            data.roles?.find((r: string) => r.startsWith("ROLE_"))?.replace("ROLE_", "") || "USER";

          return {
            id: data.username,
            name: data.username,
            accessToken: data.access_token,
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
        token.accessToken = (user as { accessToken?: string }).accessToken;
        token.roles = (user as { roles?: string[] }).roles;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        (session.user as unknown as { accessToken?: string }).accessToken = token.accessToken as string;
        (session.user as unknown as { roles?: string[] }).roles = token.roles as string[];
        (session.user as unknown as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
