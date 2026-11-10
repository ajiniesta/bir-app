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
          <h1 className="text-2xl font-bold text-gray-900">Simulacros</h1>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Exámenes completos preparados por los creadores. Puedes resolverlos tantas veces como quieras:
            no verás las respuestas correctas hasta entregar.
          </p>
        </div>
        {canManage && (
          <Link
            href="/simulacros/new"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
          >
            + Nuevo simulacro
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {mockExams.length === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-900">
          No hay simulacros disponibles para tus bancos de preguntas.
          {canManage && (
            <span className="block mt-1">
              Puedes crear uno desde{" "}
              <Link href="/simulacros/new" className="font-semibold underline hover:text-blue-700">
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
              className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800">
                    {m.examTypeCode}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    {m.questionCount} preguntas
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">{m.title}</h2>
                {m.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{m.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-6">
                  <span>
                    Intentos: <strong className="text-gray-900">{m.attemptCount}</strong>
                  </span>
                  <span>
                    Completados: <strong className="text-gray-900">{m.finishedCount}</strong>
                  </span>
                  {m.bestAccuracy !== null && m.bestAccuracy !== undefined && (
                    <span>
                      Mejor nota:{" "}
                      <strong className="text-green-600 font-semibold">
                        {m.bestAccuracy.toFixed(1)}%
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100">
                <Link
                  href={`/simulacros/${m.id}`}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Ver detalle
                </Link>

                {m.inProgressAttemptId ? (
                  <Link
                    href={`/simulacros/${m.id}/attempts/${m.inProgressAttemptId}`}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Continuar intento
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartAttempt(m.id)}
                    disabled={startingId === m.id}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {startingId === m.id ? "Iniciando..." : "Empezar simulacro"}
                  </button>
                )}

                <Link
                  href={`/simulacros/${m.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition"
                >
                  Imprimir PDF
                </Link>

                {canManage && (
                  <Link
                    href={`/simulacros/${m.id}/edit`}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
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
