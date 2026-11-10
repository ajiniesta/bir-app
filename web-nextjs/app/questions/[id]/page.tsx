import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { QuestionDetailResponse } from "../types";

export const instant = false;

function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

interface QuestionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionDetailPage(props: QuestionDetailPageProps) {
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
  const isAdmin =
    user.role === "ADMIN" || Boolean(user.roles?.includes("ROLE_ADMIN"));
  const isCreator =
    user.role === "CREATOR" || Boolean(user.roles?.includes("ROLE_CREATOR"));

  if (!isAdmin && !isCreator) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        <Navbar session={session} />
        <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div
            role="alert"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-red-200 dark:border-red-900/60 p-8 text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">Acceso denegado</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Solo los usuarios con rol <strong>ADMIN</strong> o <strong>CREATOR</strong> pueden gestionar las preguntas.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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

  try {
    const res = await fetch(`${apiBaseUrl}/api/questions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      question = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !question ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Pregunta no encontrada.</p>
            <div>
              <Link
                href="/questions"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver al listado
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Pregunta #{question.id}
              </h1>
              <div className="flex gap-2">
                <Link
                  href={`/questions/${question.id}/edit`}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Editar
                </Link>
                <Link
                  href="/questions"
                  className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
                >
                  Volver
                </Link>
              </div>
            </div>

            {/* Statement card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {question.examTypeCode || "N/A"}
                </span>
                {question.category && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/40 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    {question.category}
                  </span>
                )}
                {question.tag && (
                  <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    #{question.tag}
                  </span>
                )}
              </div>
              <p className="text-lg text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap">
                {question.text}
              </p>
            </div>

            {/* Explanation card */}
            {question.explanation && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Explicación</h2>
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

            {/* Timestamps */}
            {(question.createdAt || question.updatedAt) && (
              <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap gap-4 border-t border-slate-200 dark:border-slate-800">
                {question.createdAt && (
                  <span>Creado: {formatDate(question.createdAt)}</span>
                )}
                {question.updatedAt && (
                  <span>Modificado: {formatDate(question.updatedAt)}</span>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
