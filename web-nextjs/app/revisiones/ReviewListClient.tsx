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
        <div className="rounded-md bg-green-50 p-4 border border-green-200 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter Form */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <label htmlFor="status" className="block text-xs font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              id="status"
              name="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="PENDING">Pendientes</option>
              <option value="ACCEPTED">Aceptadas</option>
              <option value="REJECTED">Rechazadas</option>
              <option value="">Todas</option>
            </select>
          </div>

          <div>
            <label htmlFor="examType" className="block text-xs font-medium text-gray-700 mb-1">
              Banco
            </label>
            <select
              id="examType"
              name="examType"
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
            >
              Filtrar
            </button>
            <Link
              href="/revisiones"
              className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Proposals List */}
      {proposals.length === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-800">
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
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4"
              >
                {/* Header badges */}
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                      {p.examTypeCode || "—"}
                    </span>
                    {p.category && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {p.category}
                      </span>
                    )}
                    {p.tag && (
                      <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        #{p.tag}
                      </span>
                    )}
                    {p.questionId && (
                      <Link
                        href={`/questions/${p.questionId}`}
                        className="text-xs text-blue-600 hover:underline ml-1"
                      >
                        Ver pregunta #{p.questionId}
                      </Link>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold shrink-0 ${
                      isPending
                        ? "bg-amber-100 text-amber-800"
                        : isAccepted
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {isPending ? "Pendiente" : isAccepted ? "Aceptada" : "Rechazada"}
                  </span>
                </div>

                {/* Question statement */}
                <p className="text-sm font-medium text-gray-900 leading-relaxed whitespace-pre-wrap">
                  {p.questionText}
                </p>

                {/* Options list */}
                <div className="space-y-1.5">
                  {(p.options || []).map((opt) => {
                    const isCurrentCorrect = opt.isCorrect;
                    const isProposed = opt.letter === p.proposedLetter;

                    let bgClass = "bg-gray-50 border-gray-200 text-gray-800";
                    if (isCurrentCorrect) {
                      bgClass = "bg-green-50 border-green-300 text-green-950 font-medium";
                    } else if (isProposed) {
                      bgClass = "bg-amber-50 border-amber-300 text-amber-950";
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${bgClass}`}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-700 font-bold text-xs shrink-0">
                          {opt.letter}
                        </span>
                        <span className="flex-1">{opt.text}</span>
                        {isCurrentCorrect && (
                          <span className="inline-flex items-center rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Correcta actual
                          </span>
                        )}
                        {isProposed && (
                          <span className="inline-flex items-center rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            Propuesta
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Proposal details */}
                <div className="text-xs space-y-1 border-t border-gray-100 pt-3">
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
                <div className="text-xs text-gray-500">
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
                  <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                    Revisada por <strong>{p.reviewedBy}</strong> el {formatDate(p.reviewedAt)}
                    {p.reviewerNote && <span> · «{p.reviewerNote}»</span>}
                  </div>
                )}

                {/* Review Form */}
                <div className="pt-2 border-t border-gray-100 flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    value={notes[p.id] ?? p.reviewerNote ?? ""}
                    onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })}
                    placeholder="Nota de revisión (opcional)"
                    className="flex-1 min-w-[200px] rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    disabled={loadingId === p.id}
                    onClick={() => handleReview(p.id, "ACCEPTED")}
                    className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 focus:outline-none disabled:opacity-50"
                  >
                    Aceptar y aplicar
                  </button>
                  <button
                    type="button"
                    disabled={loadingId === p.id}
                    onClick={() => handleReview(p.id, "REJECTED")}
                    className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none disabled:opacity-50"
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
