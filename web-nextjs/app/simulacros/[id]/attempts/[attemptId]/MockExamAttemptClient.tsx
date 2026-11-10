"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockExamAttemptResponse, MockExamAttemptItem } from "../../../types";

interface MockExamAttemptClientProps {
  initialAttempt: MockExamAttemptResponse;
  initialPosition: number;
  mockExamId: number;
  accessToken?: string;
}

export default function MockExamAttemptClient({
  initialAttempt,
  initialPosition,
  mockExamId,
  accessToken,
}: MockExamAttemptClientProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<MockExamAttemptResponse>(initialAttempt);

  const [currentPosition, setCurrentPosition] = useState<number>(() => {
    if (initialPosition >= 1 && initialPosition <= initialAttempt.totalQuestions) {
      return initialPosition;
    }
    const firstUnanswered = initialAttempt.items.find((i) => !i.answered);
    return firstUnanswered ? firstUnanswered.position : 1;
  });

  const currentItem: MockExamAttemptItem | undefined =
    attempt.items.find((i) => i.position === currentPosition) || attempt.items[0];

  const [selectedLetter, setSelectedLetter] = useState<string>(
    currentItem?.selectedLetter || ""
  );
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelectQuestion(pos: number) {
    setCurrentPosition(pos);
    const item = attempt.items.find((i) => i.position === pos);
    setSelectedLetter(item?.selectedLetter || "");
    setSaved(false);
    setError(null);
  }

  async function handleSaveAnswer(goNext: boolean) {
    if (!currentItem || !selectedLetter) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSaved(false);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exam-attempts/${attempt.id}/answers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          position: currentItem.position,
          letter: selectedLetter,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al guardar respuesta");
      }

      const updated: MockExamAttemptResponse = await res.json();
      setAttempt(updated);
      setSaved(true);

      if (goNext) {
        // Find next unanswered after current position, or next sequential
        const nextPending = updated.items.find(
          (i) => i.position > currentPosition && !i.answered
        );
        const nextPos = nextPending
          ? nextPending.position
          : currentPosition < updated.totalQuestions
          ? currentPosition + 1
          : currentPosition;

        handleSelectQuestion(nextPos);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    const unanswered = attempt.items.filter((i) => !i.answered).length;
    let msg = "¿Estás seguro de que deseas entregar el simulacro?";
    if (unanswered > 0) {
      msg = `Tienes ${unanswered} preguntas sin responder. ${msg}`;
    }

    if (!window.confirm(msg)) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exam-attempts/${attempt.id}/finish`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al entregar simulacro");
      }

      router.push(`/simulacros/${mockExamId}/attempts/${attempt.id}/result`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSubmitting(false);
    }
  }

  const progressPercent =
    attempt.totalQuestions > 0
      ? Math.round((attempt.answeredCount * 100) / attempt.totalQuestions)
      : 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {saved && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Respuesta guardada.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {error}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Pregunta {currentPosition} de {attempt.totalQuestions}
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Respondidas: {attempt.answeredCount} / {attempt.totalQuestions}
          </span>
          <Link
            href={`/simulacros/${mockExamId}`}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Salir
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question navigator */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Ir a la pregunta:</div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {attempt.items.map((item) => {
            const isCurrent = item.position === currentPosition;
            const isAnswered = item.answered;
            return (
              <button
                key={item.position}
                type="button"
                onClick={() => handleSelectQuestion(item.position)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors flex items-center justify-center ${
                  isCurrent
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs"
                    : isAnswered
                    ? "border border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70"
                    : "border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                {item.position}
              </button>
            );
          })}
        </div>
      </div>

      {/* Question Card */}
      {currentItem && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              {attempt.examTypeCode}
            </span>
            {currentItem.category && (
              <span className="rounded-md bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:text-blue-300">
                {currentItem.category}
              </span>
            )}
            {currentItem.tag && (
              <span className="rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                #{currentItem.tag}
              </span>
            )}
          </div>

          <p className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
            {currentItem.questionText}
          </p>

          {/* Options */}
          <div className="space-y-2 pt-2">
            {currentItem.options.map((opt) => {
              const isChecked = selectedLetter === opt.letter;
              return (
                <label
                  key={opt.letter}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 text-blue-950 dark:text-blue-100 font-medium"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100"
                  }`}
                >
                  <input
                    type="radio"
                    name="letter"
                    value={opt.letter}
                    checked={isChecked}
                    onChange={() => setSelectedLetter(opt.letter)}
                    className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
                      {opt.letter}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Action bar for question */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => handleSaveAnswer(false)}
              disabled={submitting || !selectedLetter}
              className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              Guardar respuesta
            </button>
            <button
              type="button"
              onClick={() => handleSaveAnswer(true)}
              disabled={submitting || !selectedLetter}
              className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Guardar y siguiente
            </button>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {currentPosition > 1 && (
            <button
              type="button"
              onClick={() => handleSelectQuestion(currentPosition - 1)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Anterior
            </button>
          )}
          {currentPosition < attempt.totalQuestions && (
            <button
              type="button"
              onClick={() => handleSelectQuestion(currentPosition + 1)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Siguiente
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          Entregar simulacro
        </button>
      </div>
    </div>
  );
}
