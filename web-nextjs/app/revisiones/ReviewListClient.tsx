"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnswerProposal, ExamType } from "./types";

interface ReviewListClientProps {
  initialProposals: AnswerProposal[];
  examTypes: ExamType[];
  currentStatus: string;
  currentExamType: string;
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

export default function ReviewListClient({
  initialProposals,
  examTypes,
  currentStatus,
  currentExamType,
  accessToken,
}: ReviewListClientProps) {
  const router = useRouter();
  const [proposals, setProposals] = useState<AnswerProposal[]>(initialProposals);
  const [status, setStatus] = useState<string>(currentStatus);
  const [examType, setExamType] = useState<string>(currentExamType);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (examType) params.set("examType", examType);
    router.push(`/revisiones?${params.toString()}`);
  }

  async function handleReview(id: number, verdict: "ACCEPTED" | "REJECTED") {
    if (verdict === "ACCEPTED") {
      if (
        !window.confirm(
          "¿Aceptar la propuesta? La opción propuesta pasará a ser la correcta en la pregunta."
        )
      ) {
        return;
      }
    }

    setLoadingId(id);
    setMessage(null);
    setError(null);

    const note = notes[id] || "";

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/proposals/${id}/review`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          status: verdict,
          note,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al revisar la propuesta");
      }

      const updated: AnswerProposal = await res.json();
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated, status: verdict } : p)));
      setMessage("Acción realizada correctamente.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar la revisión");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-900/50 text-sm text-green-700 dark:text-green-300">
          {message}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Filter Form */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Estado
            </label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="PENDING">Pendientes</option>
              <option value="ACCEPTED">Aceptadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="">Todas</option>
            </select>
          </div>

          <div>
            <label htmlFor="examType" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Banco
            </label>
            <select
              id="examType"
              name="examType"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">Todos los bancos</option>
              {examTypes.map((et) => (
                <option key={et.id} value={et.code}>
                  {et.code} - {et.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-xs focus:outline-none transition-colors"
            >
              Filtrar
            </button>
            <Link
              href="/revisiones"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 text-center text-sm text-blue-800 dark:text-blue-300">
          No hay propuestas que mostrar con este filtro.
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((p) => {
            const isPending = p.status === "PENDING";
            const isAccepted = p.status === "ACCEPTED";
            const isRejected = p.status === "REJECTED";

            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 space-y-4"
              >
                {/* Header badges */}
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {p.examTypeCode || "—"}
                    </span>
                    {p.category && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                        {p.category}
                      </span>
                    )}
                    {p.tag && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                        #{p.tag}
                      </span>
                    )}
                    {p.questionId && (
                      <Link
                        href={`/questions/${p.questionId}`}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-1"
                      >
                        Ver pregunta #{p.questionId}
                      </Link>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                      isPending
                        ? "bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300"
                        : isAccepted
                        ? "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-300"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {isPending ? "Pendiente" : isAccepted ? "Aceptada" : "Rechazada"}
                  </span>
                </div>

                {/* Question statement */}
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {p.questionText}
                </p>

                {/* Options list */}
                <div className="space-y-1.5">
                  {(p.options || []).map((opt) => {
                    const isCurrentCorrect = opt.isCorrect;
                    const isProposed = opt.letter === p.proposedLetter;

                    let bgClass = "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200";
                    if (isCurrentCorrect) {
                      bgClass = "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800 text-green-950 dark:text-green-200 font-medium";
                    } else if (isProposed) {
                      bgClass = "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200";
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${bgClass}`}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shrink-0">
                          {opt.letter}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isCurrentCorrect && (
                          <span className="inline-flex items-center rounded-md bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Correcta actual
                          </span>
                        )}
                        {isProposed && (
                          <span className="inline-flex items-center rounded-md bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Propuesta
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Proposal details */}
                <div className="text-xs space-y-1 border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-700 dark:text-slate-300">
                  {p.proposedLetter && (
                    <div>
                      Opción propuesta: <strong>{p.proposedLetter}</strong>
                    </div>
                  )}
                  {p.proposedText && (
                    <div>
                      Respuesta alternativa propuesta: «<span>{p.proposedText}</span>»
                    </div>
                  )}
                  <div>
                    <strong>Motivo:</strong> <span>{p.comment}</span>
                  </div>
                </div>

                {/* Submission metadata */}
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span>{p.proposedByDisplayName || p.proposedBy}</span>
                  {p.proposedByDisplayName && p.proposedBy && (
                    <span> ({p.proposedBy})</span>
                  )}
                  <span> · {formatDate(p.createdAt)}</span>
                  <span> · {p.source === "FREE_SESSION" ? "Modo libre" : "Simulacro"}</span>
                  {p.position && <span> · pregunta nº {p.position}</span>}
                  {p.selectedLetter && <span> · respondió <strong>{p.selectedLetter}</strong></span>}
                </div>

                {/* Previous review info if exists */}
                {p.reviewedAt && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2">
                    Revisada por <strong>{p.reviewedBy}</strong> el {formatDate(p.reviewedAt)}
                    {p.reviewerNote && <span> · «{p.reviewerNote}»</span>}
                  </div>
                )}

                {/* Review Form */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={notes[p.id] ?? p.reviewerNote ?? ""}
                    onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                    placeholder="Nota de revisión (opcional)"
                    className="flex-1 min-w-[200px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    disabled={loadingId === p.id}
                    onClick={() => handleReview(p.id, "ACCEPTED")}
                    className="rounded-lg bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    Aceptar y aplicar
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === p.id}
                    onClick={() => handleReview(p.id, "REJECTED")}
                    className="rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:outline-none disabled:opacity-50 transition-colors"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
