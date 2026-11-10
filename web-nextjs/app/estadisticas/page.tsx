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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Estadísticas</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Tu progreso por categoría, sumando modo libre y simulacros entregados.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/free"
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Modo libre
            </Link>
            <Link
              href="/simulacros"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Simulacros
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
            {error}
          </div>
        )}

        {overview && (
          <div className="space-y-8">
            {/* Mis resultados: Tarjetas de resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Partidas</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {overview.mine.freeSessions}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Simulacros</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {overview.mine.mockAttempts}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Respondidas</div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                  {overview.mine.answered}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Acertadas</div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  {overview.mine.correct}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center col-span-2 sm:col-span-1">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">% acierto</div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {overview.mine.accuracy.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Resultados por categoría personal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tus resultados por categoría</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Se incluyen todas las categorías de tus bancos, aunque todavía no hayas respondido ninguna pregunta en ellas.
                </p>
              </div>

              {overview.mine.byCategory.length === 0 ? (
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-6 text-center text-sm text-blue-900 dark:text-blue-300">
                  Todavía no hay categorías ni respuestas registradas.{" "}
                  <Link href="/free" className="font-semibold underline hover:text-blue-700 dark:hover:text-blue-400">
                    Empieza una partida
                  </Link>
                  .
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4 text-right">Respondidas</th>
                        <th className="py-3 px-4 text-right">Acertadas</th>
                        <th className="py-3 px-4 text-right">% acierto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {overview.mine.byCategory.map((c) => (
                        <tr key={c.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.category}</td>
                          <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{c.answered}</td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{c.correct}</td>
                          <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
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
              <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Estadísticas globales</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Actividad de todos los usuarios. Visible solo para administradores y creadores.
                  </p>
                </div>

                {/* Tarjetas globales */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Usuarios activos</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {overview.global.users}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Partidas</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {overview.global.freeSessions}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Simulacros</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {overview.global.mockAttempts}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Respondidas</div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {overview.global.answered}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Acertadas</div>
                    <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      {overview.global.correct}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center col-span-2 sm:col-span-1">
                    <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">% acierto</div>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {overview.global.accuracy.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Resultados globales por categoría */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
                  <h3 className="text-sm uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Resultados globales por categoría
                  </h3>

                  {overview.global.byCategory.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      No hay categorías registradas en el banco de preguntas.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-left">
                          <tr>
                            <th className="py-3 px-4">Categoría</th>
                            <th className="py-3 px-4 text-right">Respondidas</th>
                            <th className="py-3 px-4 text-right">Acertadas</th>
                            <th className="py-3 px-4 text-right">% acierto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {overview.global.byCategory.map((c) => (
                            <tr key={c.category} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">{c.category}</td>
                              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{c.answered}</td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{c.correct}</td>
                              <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
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
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
                  <h3 className="text-sm uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                    Resultados por usuario
                  </h3>

                  {overview.global.byUser.length === 0 ? (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Todavía no hay actividad registrada.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-left">
                          <tr>
                            <th className="py-3 px-4">Usuario</th>
                            <th className="py-3 px-4 text-right">Respondidas</th>
                            <th className="py-3 px-4 text-right">Acertadas</th>
                            <th className="py-3 px-4 text-right">% acierto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {overview.global.byUser.map((u) => (
                            <tr key={u.username} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4">
                                <span className="font-semibold text-slate-900 dark:text-white">{u.displayName}</span>{" "}
                                <span className="text-xs text-slate-500 dark:text-slate-400">({u.username})</span>
                              </td>
                              <td className="py-3 px-4 text-right text-slate-700 dark:text-slate-300">{u.answered}</td>
                              <td className="py-3 px-4 text-right font-semibold text-emerald-600 dark:text-emerald-400">{u.correct}</td>
                              <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
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
