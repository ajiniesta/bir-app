"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockExamResponse, MockExamAttemptSummary } from "../types";

interface MockExamDetailClientProps {
  mockExam: MockExamResponse;
  attempts: MockExamAttemptSummary[];
  canManage: boolean;
  accessToken?: string;
}

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

export default function MockExamDetailClient({
  mockExam,
  attempts,
  canManage,
  accessToken,
}: MockExamDetailClientProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inProgressAttempt = attempts.find((a) => !a.finished);

  async function handleStartAttempt() {
    setError(null);
    setStarting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exams/${mockExam.id}/attempts`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "No se pudo iniciar el simulacro");
      }

      const attempt = await res.json();
      router.push(`/simulacros/${mockExam.id}/attempts/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStarting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("¿Eliminar este simulacro y todos sus intentos?")) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exams/${mockExam.id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "No se pudo eliminar el simulacro");
      }

      router.push("/simulacros");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {mockExam.examTypeCode}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{mockExam.title}</h1>
          {mockExam.description && (
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl">{mockExam.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/simulacros/${mockExam.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Imprimir PDF
          </Link>
          {canManage && (
            <>
              <Link
                href={`/simulacros/${mockExam.id}/edit`}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg border border-red-300 dark:border-red-900/60 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Preguntas</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">{mockExam.questionCount}</div>
        </div>

        <div>
          {inProgressAttempt ? (
            <Link
              href={`/simulacros/${mockExam.id}/attempts/${inProgressAttempt.id}`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Continuar intento en curso
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleStartAttempt}
              disabled={starting}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {starting ? "Iniciando..." : "Empezar simulacro"}
            </button>
          )}
        </div>
      </div>

      {/* Questions list */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Preguntas del simulacro</h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
          {mockExam.questions?.map((q) => (
            <div key={q.position} className="p-4 flex items-start gap-3">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {q.position}
              </span>
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{q.text}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  {q.category && <span>{q.category}</span>}
                  {q.tag && (
                    <span className="rounded bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                      #{q.tag}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attempt history */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Mis intentos</h2>
        {attempts.length === 0 ? (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-6 text-center text-sm text-blue-900 dark:text-blue-300">
            Todavía no has resuelto este simulacro.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-left">
                <tr>
                  <th className="py-3 px-4">Inicio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Respondidas</th>
                  <th className="py-3 px-4 text-right">Acertadas</th>
                  <th className="py-3 px-4 text-right">Nota</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-900 dark:text-slate-100">{formatDate(a.startedAt)}</td>
                    <td className="py-3 px-4">
                      {a.finished ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs font-semibold">
                          Entregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-semibold">
                          En curso
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      {a.answeredCount} / {a.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      {a.finished ? a.correctCount : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 dark:text-slate-100">
                      {a.finished ? `${a.accuracy.toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.finished ? (
                        <Link
                          href={`/simulacros/${mockExam.id}/attempts/${a.id}/result`}
                          className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Ver resultado
                        </Link>
                      ) : (
                        <Link
                          href={`/simulacros/${mockExam.id}/attempts/${a.id}`}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-colors"
                        >
                          Continuar
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
