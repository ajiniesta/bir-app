"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Navbar from "../components/Navbar";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          username: username.trim(),
          password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || data?.message || "Error al crear la cuenta");
      }

      router.push("/login?registered=true");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ha ocurrido un error inesperado");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar onlyWhenAuthenticated />
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Crear cuenta</h1>
            <p className="text-sm text-gray-600 mt-1">
              Regístrate para guardar tus estadísticas
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700 border border-red-200"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nombre
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={50}
                autoFocus
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-xs text-gray-500">Entre 3 y 50 caracteres.</p>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                maxLength={100}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <p className="mt-1 text-xs text-gray-500">Mínimo 6 caracteres.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <hr className="my-6 border-gray-200" />

          <div className="text-center text-sm text-gray-600 space-y-2">
            <p>
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="text-blue-600 hover:underline font-medium"
              >
                Inicia sesión
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
