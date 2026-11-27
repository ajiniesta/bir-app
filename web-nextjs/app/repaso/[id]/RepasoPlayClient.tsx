"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewSessionResponse, ReviewSessionItem } from "../types";
import { MyProposalResponse } from "@/app/free/types";
import { QuestionProposalSection } from "@/app/free/[id]/ProposalModal";
import QuestionStatsButton from "@/app/components/QuestionStatsButton";
import { getQuestionTags } from "@/app/lib/questionTags";

interface RepasoPlayClientProps {
  initialSession: ReviewSessionResponse;
  initialProposals?: MyProposalResponse[];
  accessToken?: string;
}

export default function RepasoPlayClient({
  initialSession,
  initialProposals = [],
  accessToken,
}: RepasoPlayClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<ReviewSessionResponse>(initialSession);

  const firstUnanswered =
    session.items.find((i) => !i.answered)?.position ||
    session.items[session.items.length - 1]?.position ||
    1;
  const [activePosition, setActivePosition] = useState<number>(firstUnanswered);
  const [feedbackPosition, setFeedbackPosition] = useState<number | null>(null);

  const [selectedLetter, setSelectedLetter] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [proposals, setProposals] = useState<Record<number, MyProposalResponse>>(() => {
    const map: Record<number, MyProposalResponse> = {};
    for (const p of initialProposals) {
      map[p.questionId] = p;
    }
    return map;
  });
  const [proposalSuccessMessage, setProposalSuccessMessage] = useState<string | null>(null);

  const shownItem: ReviewSessionItem | undefined =
    feedbackPosition !== null
      ? session.items.find((i) => i.position === feedbackPosition)
      : session.items.find((i) => i.position === activePosition);

  const isFeedback = feedbackPosition !== null || Boolean(shownItem?.answered);

  async function handleAnswerSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!shownItem || !selectedLetter) return;

    setError(null);
    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/review-sessions/${session.id}/answers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          position: shownItem.position,
          letter: selectedLetter,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al enviar la respuesta");
      }

      const updated: ReviewSessionResponse = await res.json();
      setSession(updated);
      setFeedbackPosition(shownItem.position);
      setSelectedLetter("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al responder");
    } finally {
      setSubmitting(false);
    }
  }

  function handleNextQuestion() {
    setError(null);
    setProposalSuccessMessage(null);
    const nextUnanswered = session.items.find((i) => !i.answered);
    if (nextUnanswered) {
      setActivePosition(nextUnanswered.position);
      setFeedbackPosition(null);
      setSelectedLetter("");
    }
  }

  async function handleFinishSession() {
    setError(null);
    setFinishing(true);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/review-sessions/${session.id}/finish`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al finalizar el repaso");
      }

      router.push(`/repaso/${session.id}/result`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al finalizar el repaso"
      );
    } finally {
      setFinishing(false);
    }
  }

  const currentProposal = shownItem ? proposals[shownItem.questionId] : undefined;
  const hasRemainingUnanswered = session.items.some((i) => !i.answered);

  return (
    <div className="space-y-4">
      {/* Top status bar */}
      <div className="flex flex-wrap justify-between items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-slate-900 dark:text-white">
            Pregunta {shownItem?.position || 1}
          </span>
          <span>Respondidas: {session.answeredCount}</span>
          <span>Acertadas: {session.correctCount}</span>
          <span>Acierto: {session.accuracy}%</span>
        </div>
        <button
          type="button"
          disabled={finishing}
          onClick={handleFinishSession}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          {finishing ? "Finalizando..." : "Finalizar repaso"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {shownItem ? (
        <div className="space-y-4">
          {/* Question statement card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {session.examTypeCode}
                </span>
                {shownItem.category && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                    {shownItem.category}
                  </span>
                )}
                {getQuestionTags(shownItem).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                  >
                    #{t}
                  </span>
                ))}
              </div>
              {typeof shownItem.questionId === "number" && (
                <QuestionStatsButton
                  questionId={shownItem.questionId}
                  accessToken={accessToken}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                />
              )}
            </div>

            <p className="text-base text-slate-900 dark:text-slate-100 leading-relaxed font-normal whitespace-pre-wrap">
              {shownItem.questionText}
            </p>
          </div>

          {isFeedback ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border text-sm font-medium ${
                  shownItem.correct
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                    : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 text-red-900 dark:text-red-200"
                }`}
              >
                {shownItem.correct ? (
                  <span>¡Correcto!</span>
                ) : (
                  <span>
                    Incorrecto. La respuesta correcta era{" "}
                    <strong>{shownItem.correctLetter}</strong>.
                  </span>
                )}
              </div>

              {/* Options list highlighted */}
              <div className="space-y-2">
                {shownItem.options.map((opt) => {
                  const isCorrect = opt.letter === shownItem.correctLetter;
                  const isSelected = opt.letter === shownItem.selectedLetter;

                  let rowStyle =
                    "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200";
                  if (isCorrect) {
                    rowStyle =
                      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 font-medium";
                  } else if (isSelected && !isCorrect) {
                    rowStyle =
                      "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-900 text-red-950 dark:text-red-100";
                  }

                  return (
                    <div
                      key={opt.letter}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm ${rowStyle}`}
                    >
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          isCorrect
                            ? "bg-emerald-600 text-white"
                            : isSelected
                            ? "bg-red-600 text-white"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {opt.letter}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">
                        {opt.text}
                      </span>
                      {isCorrect && (
                        <span className="inline-flex items-center rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Correcta
                        </span>
                      )}
                      {isSelected && !isCorrect && (
                        <span className="inline-flex items-center rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
                          Tu respuesta
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation card */}
              {shownItem.explanation && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Explicación
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {shownItem.explanation}
                  </p>
                </div>
              )}

              {!hasRemainingUnanswered && !session.hasMoreQuestions && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-blue-800 dark:text-blue-300">
                  Has respondido todas las preguntas disponibles para este filtro.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {hasRemainingUnanswered && (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-xs focus:outline-none transition-colors"
                  >
                    Siguiente pregunta
                  </button>
                )}
                <button
                  type="button"
                  disabled={finishing}
                  onClick={handleFinishSession}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {finishing ? "Finalizando..." : "Finalizar repaso"}
                </button>
              </div>

              <QuestionProposalSection
                item={shownItem}
                sessionId={session.id}
                source="REVIEW_SESSION"
                accessToken={accessToken}
                currentProposal={currentProposal}
                proposalSuccessMessage={proposalSuccessMessage}
                onProposalSuccess={(newProposal) => {
                  setProposals((prev) => ({
                    ...prev,
                    [newProposal.questionId]: newProposal,
                  }));
                  setProposalSuccessMessage(
                    "Propuesta enviada. Gracias, un revisor la valorará."
                  );
                }}
              />
            </div>
          ) : (
            /* Pending question answer form */
            <form onSubmit={handleAnswerSubmit} className="space-y-4">
              <div className="space-y-2">
                {shownItem.options.map((opt) => {
                  const isChecked = selectedLetter === opt.letter;
                  return (
                    <label
                      key={opt.letter}
                      className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 text-blue-950 dark:text-blue-100 font-medium"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reviewQuestionOption"
                        value={opt.letter}
                        checked={isChecked}
                        onChange={() => setSelectedLetter(opt.letter)}
                        required
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {opt.letter}
                      </span>
                      <span className="flex-1 whitespace-pre-wrap">
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={submitting || !selectedLetter}
                className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
              >
                {submitting ? "Enviando..." : "Responder"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 p-6 text-center text-sm text-blue-800 dark:text-blue-300 space-y-3">
          <p>No hay más preguntas disponibles en este repaso.</p>
          <div>
            <button
              type="button"
              onClick={handleFinishSession}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 shadow-xs"
            >
              Finalizar repaso
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
