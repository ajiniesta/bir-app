import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { FreeSessionResponse } from "../../types";

export const instant = false;

interface FreeResultPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FreeResultPage(props: FreeResultPageProps) {
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

  const { id } = await props.params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let freeSession: FreeSessionResponse | null = null;
  let notFound = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/free-sessions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      freeSession = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  const percent =
    freeSession && freeSession.totalQuestions > 0
      ? Math.round((freeSession.correctCount * 100) / freeSession.totalQuestions)
      : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !freeSession ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Partida no encontrada.</p>
            <div>
              <Link
                href="/free"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a configuración
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Resultado de la partida
            </h1>

            {/* Score cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Preguntas
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {freeSession.totalQuestions}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Acertadas
                </div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {freeSession.correctCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Acierto
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {percent}%
                </div>
              </div>
            </div>

            {/* Metadata summary */}
            {(freeSession.examTypeName || freeSession.category || freeSession.tag) && (
              <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                {freeSession.examTypeName && (
                  <span>
                    Tipo: <strong className="text-slate-900 dark:text-white">{freeSession.examTypeName}</strong>
                  </span>
                )}
                {freeSession.category && (
                  <span>
                    Categoría: <strong className="text-slate-900 dark:text-white">{freeSession.category}</strong>
                  </span>
                )}
                {freeSession.tag && (
                  <span>
                    Tag: <strong className="text-slate-900 dark:text-white">#{freeSession.tag}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-3">
              {(freeSession.items || []).map((item) => (
                <div
                  key={item.position}
                  className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-2"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      <span>#{item.position}. {item.questionText}</span>
                      {item.tag && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 ml-2">
                          #{item.tag}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold shrink-0 ${
                        item.correct
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800"
                      }`}
                    >
                      {item.correct ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>

                  {item.answered && (
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tu respuesta: <strong className="text-slate-800 dark:text-slate-200">{item.selectedLetter}</strong> · Correcta: <strong className="text-slate-800 dark:text-slate-200">{item.correctLetter}</strong>
                    </div>
                  )}

                  {item.explanation && (
                    <div className="pt-2 text-xs border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Explicación:</span>{" "}
                      <span className="whitespace-pre-wrap">{item.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/free"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                Nueva partida
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver al panel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
