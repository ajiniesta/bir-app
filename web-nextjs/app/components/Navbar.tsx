"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";

export interface NavbarSession {
  user?: {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };
  expires?: string;
}

interface NavbarProps {
  session?: NavbarSession | null;
  onlyWhenAuthenticated?: boolean;
}

export default function Navbar({
  session,
  onlyWhenAuthenticated = false,
}: NavbarProps) {
  const sessionState = useSession?.();
  const activeSession =
    session !== undefined
      ? session
      : (sessionState?.data as NavbarSession | null | undefined) ?? null;
  const isAuthenticated = Boolean(activeSession?.user);
  const isAdmin =
    activeSession?.user?.role === "ADMIN" ||
    Boolean(activeSession?.user?.roles?.includes("ROLE_ADMIN"));
  const isCreator =
    activeSession?.user?.role === "CREATOR" ||
    Boolean(activeSession?.user?.roles?.includes("ROLE_CREATOR"));
  const canManageQuestions = isAdmin || isCreator;

  if (onlyWhenAuthenticated && !isAuthenticated) {
    return null;
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-blue-600">
          BirApp
        </Link>
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-gray-600">
                {activeSession?.user?.name}
              </span>
              <Link
                href="/estadisticas"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Mis estadísticas
              </Link>
              {canManageQuestions && (
                <Link
                  href="/questions"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Preguntas
                </Link>
              )}
              {isAdmin && (
                <Link
                  href="/admin/users"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Administración
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-700 hover:text-blue-600"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
