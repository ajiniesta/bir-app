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
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar session={session} onlyWhenAuthenticated />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">BirApp</h1>
            <p className="text-sm text-gray-600 mt-1">
              Entra para practicar en modo libre
            </p>
          </div>

          {isRegistered && (
            <div
              role="status"
              className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700 border border-green-200"
            >
              Cuenta creada correctamente. Inicia sesión.
            </div>
          )}

          <LoginForm initialError={hasError} />

          <hr className="my-6 border-gray-200" />

          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              ¿No tienes cuenta?{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:underline font-medium"
              >
                Regístrate
              </Link>
            </p>
            <p>
              <Link href="/" className="text-gray-500 hover:underline">
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
