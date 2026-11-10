import Link from "next/link";
import { auth } from "@/auth";
import Navbar from "../components/Navbar";
import LoginForm from "./LoginForm";

export const instant = false;

interface LoginPageProps {
  searchParams?: Promise<{
    registered?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [resolvedParams, session] = await Promise.all([
    searchParams ? searchParams : Promise.resolve({} as { registered?: string; error?: string }),
    auth(),
  ]);
  const isRegistered = resolvedParams.registered === "true";
  const hasError = Boolean(resolvedParams.error);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar session={session} onlyWhenAuthenticated />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">BirApp</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Entra para practicar en modo libre
            </p>
          </div>

          {isRegistered && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            >
              Cuenta creada correctamente. Inicia sesión.
            </div>
          )}

          <LoginForm initialError={hasError} />

          <hr className="my-6 border-slate-200 dark:border-slate-800" />

          <div className="text-center text-sm text-slate-600 dark:text-slate-400 space-y-2">
            <p>
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Regístrate
              </Link>
            </p>
            <p>
              <Link href="/" className="text-slate-500 dark:text-slate-400 hover:underline">
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
