import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import QuestionStatsButton from "@/app/components/QuestionStatsButton";
import { getQuestionTags } from "@/app/lib/questionTags";
import { ReviewSessionResponse } from "../../types";

export const instant = false;

interface RepasoResultPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RepasoResultPage(props: RepasoResultPageProps) {
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

  let reviewSession: ReviewSessionResponse | null = null;
  let notFound = false;
  let unauthorized = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/review-sessions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      reviewSession = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  if (unauthorized) {
    redirect("/logout");
    return null;
  }

  const wrongCount = reviewSession
    ? Math.max(0, reviewSession.answeredCount - reviewSession.correctCount)
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !reviewSession ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Repaso no encontrado.</p>
            <div>
              <Link
                href="/repaso"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a configuración
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Resumen del repaso
            </h1>

            {/* General KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Respondidas
                </div>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {reviewSession.answeredCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Acertadas
                </div>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                  {reviewSession.correctCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Falladas
                </div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {wrongCount}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Acierto
                </div>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {reviewSession.accuracy}%
                </div>
              </div>
            </div>

            {/* Metadata summary */}
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <span>
                Banco:{" "}
                <strong className="text-slate-900 dark:text-white">
                  {reviewSession.examTypeCode} - {reviewSession.examTypeName}
                </strong>
              </span>
              {reviewSession.categories?.length > 0 && (
                <span>
                  Categorías:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {reviewSession.categories.join(", ")}
                  </strong>
                </span>
              )}
              {reviewSession.tags?.length > 0 && (
                <span>
                  Tags:{" "}
                  <strong className="text-slate-900 dark:text-white">
                    {reviewSession.tags.map((t) => `#${t}`).join(", ")}
                  </strong>
                </span>
              )}
              {reviewSession.onlyDoubt && (
                <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Preguntas en duda
                </span>
              )}
              {reviewSession.onlyFailed && (
                <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                  Preguntas fallidas
                </span>
              )}
            </div>

            {/* Category statistics section */}
            <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Estadísticas por categoría
              </h2>
              {reviewSession.byCategory && reviewSession.byCategory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 dark:text-slate-400">
                        <th className="py-2 pr-4">Categoría</th>
                        <th className="py-2 px-4">Respondidas</th>
                        <th className="py-2 px-4">Acertadas</th>
                        <th className="py-2 pl-4">Acierto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reviewSession.byCategory.map((cat) => (
                        <tr key={cat.category}>
                          <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                            {cat.category}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            {cat.answered}
                          </td>
                          <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">
                            {cat.correct}
                          </td>
                          <td className="py-2.5 pl-4 font-semibold text-blue-600 dark:text-blue-400">
                            {cat.accuracy}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No se respondieron preguntas en este repaso.
                </p>
              )}
            </section>

            {/* Resolved questions list */}
            <div className="space-y-3">
              {(reviewSession.items || [])
                .filter((item) => item.answered)
                .map((item) => (
                  <div
                    key={item.position}
                    className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <span>
                          #{item.position}. {item.questionText}
                        </span>
                        {getQuestionTags(item).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 ml-2"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {typeof item.questionId === "number" && (
                          <QuestionStatsButton
                            questionId={item.questionId}
                            accessToken={user.accessToken}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          />
                        )}
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
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Tu respuesta:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {item.selectedLetter}
                      </strong>{" "}
                      · Correcta:{" "}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {item.correctLetter}
                      </strong>
                    </div>

                    {item.explanation && (
                      <div className="pt-2 text-xs border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Explicación:
                        </span>{" "}
                        <span className="whitespace-pre-wrap">
                          {item.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/repaso"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                Nuevo repaso
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
