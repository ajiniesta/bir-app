"use client";

import { useState } from "react";
import { FreeSessionItem, MyProposalResponse } from "../types";

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FreeSessionItem;
  sessionId: number;
  accessToken?: string;
  onSuccess: (proposal: MyProposalResponse) => void;
}

export default function ProposalModal({
  isOpen,
  onClose,
  item,
  sessionId,
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
          source: "FREE_SESSION",
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
              <option value="">— Ninguna / no lo sé —</option>
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
