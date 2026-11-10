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
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 mb-2">
            {mockExam.examTypeCode}
          </span>
          <h1 className="text-2xl font-bold text-gray-900">{mockExam.title}</h1>
          {mockExam.description && (
            <p className="text-sm text-gray-600 mt-1 max-w-3xl">{mockExam.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/simulacros/${mockExam.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-400 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition"
          >
            Imprimir PDF
          </Link>
          {canManage && (
            <>
              <Link
                href={`/simulacros/${mockExam.id}/edit`}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action Banner */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs uppercase font-semibold text-gray-500">Preguntas</div>
          <div className="text-xl font-bold text-gray-900">{mockExam.questionCount}</div>
        </div>

        <div>
          {inProgressAttempt ? (
            <Link
              href={`/simulacros/${mockExam.id}/attempts/${inProgressAttempt.id}`}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Continuar intento en curso
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleStartAttempt}
              disabled={starting}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
            >
              {starting ? "Iniciando..." : "Empezar simulacro"}
            </button>
          )}
        </div>
      </div>

      {/* Questions list */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Preguntas del simulacro</h2>
        <div className="divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {mockExam.questions?.map((q) => (
            <div key={q.position} className="p-4 flex items-start gap-3">
              <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                {q.position}
              </span>
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900">{q.text}</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  {q.category && <span>{q.category}</span>}
                  {q.tag && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 font-medium">
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
        <h2 className="text-lg font-bold text-gray-900 mb-4">Mis intentos</h2>
        {attempts.length === 0 ? (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-900">
            Todavía no has resuelto este simulacro.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold text-left">
                <tr>
                  <th className="py-3 px-4">Inicio</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Respondidas</th>
                  <th className="py-3 px-4 text-right">Acertadas</th>
                  <th className="py-3 px-4 text-right">Nota</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {attempts.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4 text-gray-900">{formatDate(a.startedAt)}</td>
                    <td className="py-3 px-4">
                      {a.finished ? (
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                          Entregado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          En curso
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {a.answeredCount} / {a.totalQuestions}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {a.finished ? a.correctCount : "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {a.finished ? `${a.accuracy.toFixed(1)}%` : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {a.finished ? (
                        <Link
                          href={`/simulacros/${mockExam.id}/attempts/${a.id}/result`}
                          className="rounded-md border border-blue-600 bg-white px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                        >
                          Ver resultado
                        </Link>
                      ) : (
                        <Link
                          href={`/simulacros/${mockExam.id}/attempts/${a.id}`}
                          className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-blue-700 transition"
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
