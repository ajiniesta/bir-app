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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
    >
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <h2 id="proposal-modal-title" className="text-lg font-bold text-gray-900">
            Proponer respuesta alternativa
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
            aria-label="Cerrar"
          >
            &times;
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-md bg-red-50 p-3 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div>
            <label htmlFor="proposedLetter" className="block text-xs font-medium text-gray-700 mb-1">
              Creo que la opción correcta es
            </label>
            <select
              id="proposedLetter"
              value={proposedLetter}
              onChange={(e) => setProposedLetter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="proposedText" className="block text-xs font-medium text-gray-700 mb-1">
              Otra respuesta alternativa (texto)
            </label>
            <textarea
              id="proposedText"
              rows={2}
              value={proposedText}
              onChange={(e) => setProposedText(e.target.value)}
              placeholder="Si la respuesta correcta debería ser otra distinta de las opciones"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="comment" className="block text-xs font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              id="comment"
              rows={3}
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Explica por qué la respuesta es errónea o conflictiva"
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 focus:outline-none disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "Enviar propuesta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
