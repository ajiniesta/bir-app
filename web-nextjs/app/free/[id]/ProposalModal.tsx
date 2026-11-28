"use client";

import { useState } from "react";
import { FreeSessionItem, MyProposalResponse } from "../types";

export type ProposalSourceType = "FREE_SESSION" | "REVIEW_SESSION";

export interface ProposalItemLike {
  position: number;
  questionId: number;
  options: { letter: string; text: string }[];
  selectedLetter?: string | null;
}

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ProposalItemLike | FreeSessionItem;
  sessionId: number;
  source?: ProposalSourceType;
  accessToken?: string;
  onSuccess: (proposal: MyProposalResponse) => void;
}

export default function ProposalModal({
  isOpen,
  onClose,
  item,
  sessionId,
  source = "FREE_SESSION",
  accessToken,
  onSuccess,
}: ProposalModalProps) {
  const [proposedLetter, setProposedLetter] = useState("");
  const [proposedText, setProposedText] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!comment.trim()) {
      setError("El motivo es obligatorio.");
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch("/api/proposals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          questionId: item.questionId,
          proposedLetter: proposedLetter || null,
          proposedText: proposedText.trim() || null,
          comment: comment.trim(),
          source,
          sourceId: sessionId,
          position: item.position,
          selectedLetter: item.selectedLetter || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al enviar la propuesta");
      }

      const created: MyProposalResponse = await res.json();
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al enviar propuesta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-900 dark:text-slate-100">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 id="proposal-modal-title" className="text-lg font-bold text-slate-900 dark:text-white">
            Proponer respuesta alternativa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none p-1"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label htmlFor="proposedLetter" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Creo que la opción correcta es
            </label>
            <select
              id="proposedLetter"
              value={proposedLetter}
              onChange={(e) => setProposedLetter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            >
              <option value="">— Ninguna (invalidar pregunta) —</option>
              {item.options.map((opt) => (
                <option key={opt.letter} value={opt.letter}>
                  {opt.letter}) {opt.text}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="proposedText" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Otra respuesta alternativa (texto)
            </label>
            <textarea
              id="proposedText"
              rows={2}
              value={proposedText}
              onChange={(e) => setProposedText(e.target.value)}
              placeholder="Si la respuesta correcta debería ser otra distinta de las opciones"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="comment" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              id="comment"
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explica por qué la respuesta es errónea o conflictiva"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
            >
              {submitting ? "Enviando..." : "Enviar propuesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface QuestionProposalSectionProps {
  item: ProposalItemLike;
  sessionId: number;
  source?: ProposalSourceType;
  accessToken?: string;
  currentProposal?: MyProposalResponse;
  proposalSuccessMessage: string | null;
  onProposalSuccess: (proposal: MyProposalResponse) => void;
}

export function QuestionProposalSection({
  item,
  sessionId,
  source = "FREE_SESSION",
  accessToken,
  currentProposal,
  proposalSuccessMessage,
  onProposalSuccess,
}: QuestionProposalSectionProps) {
  const [showModal, setShowModal] = useState(false);
  const [markedDoubtQuestions, setMarkedDoubtQuestions] = useState<Record<number, boolean>>({});
  const [markingDoubt, setMarkingDoubt] = useState(false);
  const [doubtError, setDoubtError] = useState<string | null>(null);

  const isMarkedInDoubt = Boolean(markedDoubtQuestions[item.questionId]);

  async function handleMarkAsDoubt() {
    if (isMarkedInDoubt || markingDoubt) return;
    setDoubtError(null);
    setMarkingDoubt(true);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `/api/question-status/questions/${item.questionId}/doubt`,
        {
          method: "POST",
          headers,
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "No se pudo marcar la pregunta en duda");
      }

      setMarkedDoubtQuestions((prev) => ({
        ...prev,
        [item.questionId]: true,
      }));
    } catch (err: unknown) {
      setDoubtError(
        err instanceof Error
          ? err.message
          : "No se pudo marcar la pregunta en duda"
      );
    } finally {
      setMarkingDoubt(false);
    }
  }

  return (
    <>
      {doubtError && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 border border-red-200 dark:border-red-900/60 text-xs text-red-800 dark:text-red-300"
        >
          {doubtError}
        </div>
      )}

      {/* Manual Doubt Override Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap justify-between items-center gap-3">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          ¿Has acertado con dudas o quieres repasar esta pregunta más adelante?
        </span>
        <button
          type="button"
          disabled={isMarkedInDoubt || markingDoubt}
          onClick={handleMarkAsDoubt}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none ${
            isMarkedInDoubt
              ? "border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 cursor-default"
              : "border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
          }`}
        >
          {isMarkedInDoubt
            ? "Marcada en duda"
            : markingDoubt
            ? "Marcando..."
            : "Poner en duda"}
        </button>
      </div>

      {proposalSuccessMessage && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
          {proposalSuccessMessage}
        </div>
      )}

      {currentProposal && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
          Ya enviaste una propuesta:{" "}
          <strong>
            {currentProposal.status === "PENDING"
              ? "pendiente de revisión"
              : currentProposal.status === "ACCEPTED"
              ? "aceptada"
              : "rechazada"}
          </strong>
          {currentProposal.proposedLetter && (
            <span> (Opción propuesta: {currentProposal.proposedLetter})</span>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap justify-between items-center gap-3">
        <span className="text-xs text-slate-600 dark:text-slate-400">
          ¿Crees que la respuesta correcta es errónea o conflictiva?
        </span>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors focus:outline-none"
        >
          Proponer cambio
        </button>
      </div>

      <ProposalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        item={item}
        sessionId={sessionId}
        source={source}
        accessToken={accessToken}
        onSuccess={onProposalSuccess}
      />
    </>
  );
}
