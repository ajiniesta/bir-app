"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockExamSummary } from "./types";

interface MockExamListClientProps {
  initialMockExams: MockExamSummary[];
  canManage: boolean;
  accessToken?: string;
}

export default function MockExamListClient({
  initialMockExams,
  canManage,
  accessToken,
}: MockExamListClientProps) {
  const router = useRouter();
  const [mockExams] = useState<MockExamSummary[]>(initialMockExams);
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStartAttempt(examId: number) {
    setError(null);
    setStartingId(examId);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exams/${examId}/attempts`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "No se pudo iniciar el simulacro");
      }

      const attempt = await res.json();
      router.push(`/simulacros/${examId}/attempts/${attempt.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Simulacros</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Exámenes completos preparados por los creadores. Puedes resolverlos tantas veces como quieras:
            no verás las respuestas correctas hasta entregar.
          </p>
        </div>
        {canManage && (
          <Link
            href="/simulacros/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            + Nuevo simulacro
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {error}
        </div>
      )}

      {mockExams.length === 0 ? (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-6 text-center text-sm text-blue-900 dark:text-blue-300">
          No hay simulacros disponibles para tus bancos de preguntas.
          {canManage && (
            <span className="block mt-1">
              Puedes crear uno desde{" "}
              <Link href="/simulacros/new" className="font-semibold underline hover:text-blue-700 dark:hover:text-blue-400">
                aquí
              </Link>
              .
            </span>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockExams.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs hover:shadow-md dark:hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {m.examTypeCode}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {m.questionCount} preguntas
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{m.title}</h2>
                {m.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">{m.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-6">
                  <span>
                    Intentos: <strong className="text-slate-900 dark:text-white">{m.attemptCount}</strong>
                  </span>
                  <span>
                    Completados: <strong className="text-slate-900 dark:text-white">{m.finishedCount}</strong>
                  </span>
                  {m.bestAccuracy !== null && m.bestAccuracy !== undefined && (
                    <span>
                      Mejor nota:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        {m.bestAccuracy.toFixed(1)}%
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/simulacros/${m.id}`}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Ver detalle
                </Link>

                {m.inProgressAttemptId ? (
                  <Link
                    href={`/simulacros/${m.id}/attempts/${m.inProgressAttemptId}`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-colors"
                  >
                    Continuar intento
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartAttempt(m.id)}
                    disabled={startingId === m.id}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
                  >
                    {startingId === m.id ? "Iniciando..." : "Empezar simulacro"}
                  </button>
                )}

                <Link
                  href={`/simulacros/${m.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Imprimir PDF
                </Link>

                {canManage && (
                  <Link
                    href={`/simulacros/${m.id}/edit`}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Editar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
