import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import QuestionStatsButton from "@/app/components/QuestionStatsButton";
import { getQuestionTags } from "@/app/lib/questionTags";
import { QuestionDetailResponse } from "@/app/questions/types";

export const instant = false;

interface DoubtQuestionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DoubtQuestionDetailPage(
  props: DoubtQuestionDetailPageProps
) {
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

  let question: QuestionDetailResponse | null = null;
  let notFound = false;
  let unauthorized = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/question-status/doubts/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      question = await res.json();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !question ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Pregunta en duda no encontrada.</p>
            <div>
              <Link
                href="/dudas"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a preguntas en duda
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Pregunta #{question.id}
                </h1>
                {question.learningStatus === "FAILED" ? (
                  <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                    Fallida
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    En duda
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <QuestionStatsButton
                  questionId={question.id}
                  accessToken={user.accessToken}
                />
                <Link
                  href={`/repaso?examType=${encodeURIComponent(question.examTypeCode || "")}&onlyDoubt=true&onlyFailed=true`}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Repasar dudas/fallidas de {question.examTypeCode}
                </Link>
                <Link
                  href="/dudas"
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
                >
                  Volver a preguntas en duda
                </Link>
              </div>
            </div>

            {/* Statement card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {question.examTypeCode || "N/A"}
                </span>
                {question.category && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {question.category}
                  </span>
                )}
                {getQuestionTags(question).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              <p className="text-lg text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap">
                {question.text}
              </p>
            </div>

            {/* Explanation card */}
            {question.explanation && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Explicación
                </h2>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Options list */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Opciones de respuesta
              </h2>
              <div className="space-y-2">
                {question.answerOptions.map((opt) => (
                  <div
                    key={opt.letter}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm transition-colors ${
                      opt.isCorrect
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-medium"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        opt.isCorrect
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {opt.letter}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap">{opt.text}</span>
                    {opt.isCorrect && (
                      <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Correcta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
