"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

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
  const pathname = typeof usePathname === "function" ? (usePathname() ?? "") : "";
  const sessionState = useSession?.();
  const activeSession =
    session !== undefined
      ? session
      : (sessionState?.data as NavbarSession | null | undefined) ?? null;
  const isAuthenticated = Boolean(activeSession?.user);
  const userName = activeSession?.user?.name || "Usuario";
  const userRole = activeSession?.user?.role || "USER";

  const isAdmin =
    activeSession?.user?.role === "ADMIN" ||
    Boolean(activeSession?.user?.roles?.includes("ROLE_ADMIN"));
  const isCreator =
    activeSession?.user?.role === "CREATOR" ||
    Boolean(activeSession?.user?.roles?.includes("ROLE_CREATOR"));
  const canManageQuestions = isAdmin || isCreator;

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Close menus on route navigation
  useEffect(() => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (onlyWhenAuthenticated && !isAuthenticated) {
    return null;
  }

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navItemClass = (href: string) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
      isLinkActive(href)
        ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400 font-semibold shadow-xs"
        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    }`;

  const mobileNavItemClass = (href: string) =>
    `block px-3 py-2.5 rounded-lg text-base font-medium transition-all ${
      isLinkActive(href)
        ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400 font-semibold"
        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Desktop Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 group transition-transform active:scale-95"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:shadow-md transition-shadow">
                B
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                BirApp
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            {isAuthenticated && (
              <nav className="hidden lg:flex items-center space-x-1">
                <Link href="/free" className={navItemClass("/free")}>
                  Modo libre
                </Link>
                <Link href="/simulacros" className={navItemClass("/simulacros")}>
                  Simulacros
                </Link>
                <Link
                  href="/estadisticas"
                  className={navItemClass("/estadisticas")}
                >
                  Mis estadísticas
                </Link>
                {canManageQuestions && (
                  <>
                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                    <Link
                      href="/questions"
                      className={navItemClass("/questions")}
                    >
                      Preguntas
                    </Link>
                    <Link
                      href="/revisiones"
                      className={navItemClass("/revisiones")}
                    >
                      Revisiones
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <Link
                    href="/admin/users"
                    className={navItemClass("/admin/users")}
                  >
                    Administración
                  </Link>
                )}
              </nav>
            )}
          </div>

          {/* Right: Actions, Theme Toggle, User Dropdown */}
          <div className="hidden lg:flex items-center space-x-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  id="user-menu-button"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 rounded-full p-1.5 pr-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-xs font-bold uppercase shadow-xs">
                    {userName.charAt(0)}
                  </div>
                  <span className="font-semibold">{userName}</span>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                <div
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                  className={`absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg py-1.5 z-50 transition-all duration-150 ${
                    isUserMenuOpen
                      ? "opacity-100 scale-100 pointer-events-auto"
                      : "opacity-0 scale-95 pointer-events-none"
                  }`}
                >
                  <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                      Conectado como
                    </p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {userName}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Rol: {userRole}
                    </span>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Perfil
                  </Link>

                  <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                  <div className="px-2 py-1">
                    <LogoutButton className="w-full text-left flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors font-medium" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Right Controls: Theme Toggle + Hamburger Toggle */}
          <div className="flex lg:hidden items-center space-x-2">
            <ThemeToggle />

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown Panel */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-md">
          {isAuthenticated ? (
            <>
              {/* User summary in mobile drawer */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold">
                    {userName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {userName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Rol: {userRole}
                    </p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Ver Perfil
                </Link>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1">
                <Link href="/free" className={mobileNavItemClass("/free")}>
                  Modo libre
                </Link>
                <Link
                  href="/simulacros"
                  className={mobileNavItemClass("/simulacros")}
                >
                  Simulacros
                </Link>
                <Link
                  href="/estadisticas"
                  className={mobileNavItemClass("/estadisticas")}
                >
                  Mis estadísticas
                </Link>

                {canManageQuestions && (
                  <>
                    <div className="pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Gestión
                    </div>
                    <Link
                      href="/questions"
                      className={mobileNavItemClass("/questions")}
                    >
                      Preguntas
                    </Link>
                    <Link
                      href="/revisiones"
                      className={mobileNavItemClass("/revisiones")}
                    >
                      Revisiones
                    </Link>
                  </>
                )}

                {isAdmin && (
                  <>
                    <div className="pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Administración
                    </div>
                    <Link
                      href="/admin/users"
                      className={mobileNavItemClass("/admin/users")}
                    >
                      Administración de usuarios
                    </Link>
                  </>
                )}
              </nav>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <LogoutButton className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors" />
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <Link
                href="/login"
                className="block text-center w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="block text-center w-full px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 shadow-xs"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
