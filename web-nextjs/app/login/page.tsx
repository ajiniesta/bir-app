import Link from "next/link";

export const instant = false;

interface LoginPageProps {
  searchParams?: Promise<{
    registered?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const isRegistered = resolvedParams.registered === "true";
  const hasError = Boolean(resolvedParams.error);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
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

        {hasError && (
          <div
            role="alert"
            className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200"
          >
            Usuario o contraseña incorrectos
          </div>
        )}

        <form action="/api/auth/login" method="POST" className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Usuario
            </label>
            <input
              type="text"
              id="username"
              name="username"
              required
              autoFocus
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            Entrar
          </button>
        </form>

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
  );
}
