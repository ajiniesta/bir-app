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
    if (
      !window.confirm(
        "¿Entregar el simulacro? Ya no podrás cambiar tus respuestas."
      )
    ) {
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
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800 border border-green-200">
          Respuesta guardada.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-gray-700">
          Pregunta {currentPosition} de {attempt.totalQuestions}
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-500 font-medium">
            Respondidas: {attempt.answeredCount} / {attempt.totalQuestions}
          </span>
          <Link
            href={`/simulacros/${mockExamId}`}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Salir
          </Link>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Question navigator */}
      <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="text-xs font-semibold text-gray-500 mb-2">Ir a la pregunta:</div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
          {attempt.items.map((item) => {
            const isCurrent = item.position === currentPosition;
            const isAnswered = item.answered;
            return (
              <button
                key={item.position}
                type="button"
                onClick={() => handleSelectQuestion(item.position)}
                className={`w-8 h-8 rounded text-xs font-bold transition flex items-center justify-center ${
                  isCurrent
                    ? "bg-gray-900 text-white"
                    : isAnswered
                    ? "border border-green-600 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
              {attempt.examTypeCode}
            </span>
            {currentItem.category && (
              <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                {currentItem.category}
              </span>
            )}
            {currentItem.tag && (
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                #{currentItem.tag}
              </span>
            )}
          </div>

          <p className="text-base sm:text-lg font-medium text-gray-900 leading-relaxed">
            {currentItem.questionText}
          </p>

          {/* Options */}
          <div className="space-y-2 pt-2">
            {currentItem.options.map((opt) => {
              const isChecked = selectedLetter === opt.letter;
              return (
                <label
                  key={opt.letter}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    isChecked
                      ? "border-blue-600 bg-blue-50/50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="letter"
                    value={opt.letter}
                    checked={isChecked}
                    onChange={() => setSelectedLetter(opt.letter)}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-gray-200 text-xs font-bold text-gray-800">
                      {opt.letter}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Action bar for question */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => handleSaveAnswer(false)}
              disabled={submitting || !selectedLetter}
              className="rounded-md border border-blue-600 bg-white px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
            >
              Guardar respuesta
            </button>
            <button
              type="button"
              onClick={() => handleSaveAnswer(true)}
              disabled={submitting || !selectedLetter}
              className="rounded-md bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
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
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Anterior
            </button>
          )}
          {currentPosition < attempt.totalQuestions && (
            <button
              type="button"
              onClick={() => handleSelectQuestion(currentPosition + 1)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Siguiente
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleFinish}
          disabled={submitting}
          className="rounded-md bg-green-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-green-700 transition disabled:opacity-50"
        >
          Entregar simulacro
        </button>
      </div>
    </div>
  );
}
