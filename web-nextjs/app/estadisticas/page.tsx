import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { StatsOverviewResponse } from "./types";

export const instant = false;

export default async function EstadisticasPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const user = session.user as {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let overview: StatsOverviewResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/stats/overview`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      overview = await res.json();
    } else {
      error = "No se pudieron cargar las estadísticas.";
    }
  } catch (err: unknown) {
    error = "No se pudieron cargar las estadísticas: " + (err instanceof Error ? err.message : "error inesperado");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar session={session} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
            <p className="text-sm text-gray-600 mt-1 max-w-2xl">
              Tu progreso por categoría, sumando modo libre y simulacros entregados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/free"
              className="rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Modo libre
            </Link>
            <Link
              href="/simulacros"
              className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Simulacros
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {overview && (
          <div className="space-y-8">
            {/* Mis resultados: Tarjetas de resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-xs uppercase font-semibold text-gray-500">Partidas</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {overview.mine.freeSessions}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-xs uppercase font-semibold text-gray-500">Simulacros</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {overview.mine.mockAttempts}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-xs uppercase font-semibold text-gray-500">Respondidas</div>
                <div className="text-3xl font-bold text-gray-900 mt-1">
                  {overview.mine.answered}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                <div className="text-xs uppercase font-semibold text-gray-500">Acertadas</div>
                <div className="text-3xl font-bold text-green-600 mt-1">
                  {overview.mine.correct}
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center col-span-2 sm:col-span-1">
                <div className="text-xs uppercase font-semibold text-gray-500">% acierto</div>
                <div className="text-3xl font-bold text-blue-600 mt-1">
                  {overview.mine.accuracy.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Resultados por categoría personal */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Tus resultados por categoría</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Se incluyen todas las categorías de tus bancos, aunque todavía no hayas respondido ninguna pregunta en ellas.
                </p>
              </div>

              {overview.mine.byCategory.length === 0 ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-900">
                  Todavía no hay categorías ni respuestas registradas.{" "}
                  <Link href="/free" className="font-semibold underline hover:text-blue-700">
                    Empieza una partida
                  </Link>
                  .
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4 text-right">Respondidas</th>
                        <th className="py-3 px-4 text-right">Acertadas</th>
                        <th className="py-3 px-4 text-right">% acierto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {overview.mine.byCategory.map((c) => (
                        <tr key={c.category} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-medium text-gray-900">{c.category}</td>
                          <td className="py-3 px-4 text-right text-gray-700">{c.answered}</td>
                          <td className="py-3 px-4 text-right font-semibold text-green-600">{c.correct}</td>
                          <td className="py-3 px-4 text-right font-medium text-gray-900">
                            {c.accuracy.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Sección global (ADMIN / CREATOR) */}
            {overview.global && (
              <div className="space-y-6 pt-6 border-t border-gray-200">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Estadísticas globales</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Actividad de todos los usuarios. Visible solo para administradores y creadores.
                  </p>
                </div>

                {/* Tarjetas globales */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-xs uppercase font-semibold text-gray-500">Usuarios activos</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {overview.global.users}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-xs uppercase font-semibold text-gray-500">Partidas</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {overview.global.freeSessions}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-xs uppercase font-semibold text-gray-500">Simulacros</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {overview.global.mockAttempts}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-xs uppercase font-semibold text-gray-500">Respondidas</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                      {overview.global.answered}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-xs uppercase font-semibold text-gray-500">Acertadas</div>
                    <div className="text-3xl font-bold text-green-600 mt-1">
                      {overview.global.correct}
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center col-span-2 sm:col-span-1">
                    <div className="text-xs uppercase font-semibold text-gray-500">% acierto</div>
                    <div className="text-3xl font-bold text-blue-600 mt-1">
                      {overview.global.accuracy.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Resultados globales por categoría */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm uppercase font-bold text-gray-500 tracking-wider">
                    Resultados globales por categoría
                  </h3>

                  {overview.global.byCategory.length === 0 ? (
                    <div className="text-xs text-gray-500">
                      No hay categorías registradas en el banco de preguntas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-left">
                          <tr>
                            <th className="py-3 px-4">Categoría</th>
                            <th className="py-3 px-4 text-right">Respondidas</th>
                            <th className="py-3 px-4 text-right">Acertadas</th>
                            <th className="py-3 px-4 text-right">% acierto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {overview.global.byCategory.map((c) => (
                            <tr key={c.category} className="hover:bg-gray-50/50 transition">
                              <td className="py-3 px-4 font-medium text-gray-900">{c.category}</td>
                              <td className="py-3 px-4 text-right text-gray-700">{c.answered}</td>
                              <td className="py-3 px-4 text-right font-semibold text-green-600">{c.correct}</td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900">
                                {c.accuracy.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Resultados por usuario */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                  <h3 className="text-sm uppercase font-bold text-gray-500 tracking-wider">
                    Resultados por usuario
                  </h3>

                  {overview.global.byUser.length === 0 ? (
                    <div className="text-xs text-gray-500">
                      Todavía no hay actividad registrada.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50 text-gray-500 font-semibold text-left">
                          <tr>
                            <th className="py-3 px-4">Usuario</th>
                            <th className="py-3 px-4 text-right">Respondidas</th>
                            <th className="py-3 px-4 text-right">Acertadas</th>
                            <th className="py-3 px-4 text-right">% acierto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {overview.global.byUser.map((u) => (
                            <tr key={u.username} className="hover:bg-gray-50/50 transition">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-gray-900">{u.displayName}</span>{" "}
                                <span className="text-xs text-gray-500">({u.username})</span>
                              </td>
                              <td className="py-3 px-4 text-right text-gray-700">{u.answered}</td>
                              <td className="py-3 px-4 text-right font-semibold text-green-600">{u.correct}</td>
                              <td className="py-3 px-4 text-right font-medium text-gray-900">
                                {u.accuracy.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
