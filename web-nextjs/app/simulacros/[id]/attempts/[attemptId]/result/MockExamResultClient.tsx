"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MockExamAttemptResponse, MyProposalResponse } from "../../../../types";

interface MockExamResultClientProps {
  attempt: MockExamAttemptResponse;
  initialProposals: MyProposalResponse[];
  mockExamId: number;
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

export default function MockExamResultClient({
  attempt,
  initialProposals,
  mockExamId,
  accessToken,
}: MockExamResultClientProps) {
  const router = useRouter();

  const [proposals, setProposals] = useState<Record<number, MyProposalResponse>>(() => {
    const map: Record<number, MyProposalResponse> = {};
    for (const p of initialProposals) {
      map[p.questionId] = p;
    }
    return map;
  });

  const [proposalForms, setProposalForms] = useState<
    Record<number, { letter: string; text: string; comment: string }>
  >({});
  const [submittingProposalId, setSubmittingProposalId] = useState<number | null>(null);
  const [proposalSuccess, setProposalSuccess] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);

  const [repeating, setRepeating] = useState(false);
  const [repeatError, setRepeatError] = useState<string | null>(null);

  const blankCount = attempt.items.filter((i) => !i.answered).length;

  function updateFormField(
    qId: number,
    field: "letter" | "text" | "comment",
    value: string
  ) {
    setProposalForms((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || { letter: "", text: "", comment: "" }),
        [field]: value,
      },
    }));
  }

  async function handleSubmitProposal(e: React.FormEvent, questionId: number, position: number, selectedLetter: string | null) {
    e.preventDefault();
    const form = proposalForms[questionId];
    if (!form || !form.comment.trim()) {
      setProposalError("El motivo de la propuesta es obligatorio.");
      return;
    }

    setSubmittingProposalId(questionId);
    setProposalSuccess(null);
    setProposalError(null);

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
          questionId,
          proposedLetter: form.letter || null,
          proposedText: form.text.trim() || null,
          comment: form.comment.trim(),
          source: "MOCK_EXAM_ATTEMPT",
          sourceId: attempt.id,
          position,
          selectedLetter,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al enviar la propuesta");
      }

      const created: MyProposalResponse = await res.json();
      setProposals((prev) => ({
        ...prev,
        [questionId]: created,
      }));
      setProposalSuccess("Propuesta enviada. Gracias, un revisor la valorará.");
    } catch (err: unknown) {
      setProposalError(err instanceof Error ? err.message : "Error al enviar la propuesta");
    } finally {
      setSubmittingProposalId(null);
    }
  }

  async function handleRepeat() {
    setRepeatError(null);
    setRepeating(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/mock-exams/${mockExamId}/attempts`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "No se pudo repetir el simulacro");
      }

      const newAttempt = await res.json();
      router.push(`/simulacros/${mockExamId}/attempts/${newAttempt.id}`);
    } catch (err: unknown) {
      setRepeatError(err instanceof Error ? err.message : "Error inesperado");
      setRepeating(false);
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {proposalSuccess && (
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-4 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          {proposalSuccess}
        </div>
      )}

      {proposalError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {proposalError}
        </div>
      )}

      {repeatError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {repeatError}
        </div>
      )}

      {/* Header */}
      <div>
        <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
          {attempt.examTypeCode}
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{attempt.mockExamTitle}</h1>
        {attempt.finishedAt && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Entregado el {formatDate(attempt.finishedAt)}
          </p>
        )}
      </div>

      {/* Score Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Preguntas</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{attempt.totalQuestions}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Acertadas</div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{attempt.correctCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">En blanco</div>
          <div className="text-3xl font-bold text-slate-500 dark:text-slate-400 mt-1">{blankCount}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
          <div className="text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">Nota</div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {attempt.accuracy.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Revisión</h2>
        <div className="space-y-4">
          {attempt.items.map((item) => {
            const myProposal = item.questionId ? proposals[item.questionId] : undefined;
            const form = proposalForms[item.questionId] || { letter: "", text: "", comment: "" };

            return (
              <div
                key={item.position}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                      {item.position}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.questionText}
                      </div>
                      {item.tag && (
                        <span className="mt-1 inline-block rounded bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          #{item.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {!item.answered ? (
                      <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                        En blanco
                      </span>
                    ) : item.correct ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs font-semibold">
                        Correcta
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-50 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800 px-2 py-0.5 text-xs font-semibold">
                        Incorrecta
                      </span>
                    )}
                  </div>
                </div>

                {/* Options Review */}
                <div className="space-y-1.5 pt-1">
                  {item.options.map((opt) => {
                    const isCorrect = opt.letter === item.correctLetter;
                    const isSelected = opt.letter === item.selectedLetter;

                    let rowStyle = "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-slate-800 dark:text-slate-200";
                    if (isCorrect) {
                      rowStyle = "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 font-medium";
                    } else if (isSelected && !isCorrect) {
                      rowStyle = "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 text-red-950 dark:text-red-100";
                    }

                    return (
                      <div
                        key={opt.letter}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${rowStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{opt.letter})</span>
                          <span>{opt.text}</span>
                        </div>
                        <div>
                          {isCorrect && (
                            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              Correcta
                            </span>
                          )}
                          {isSelected && !isCorrect && (
                            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white ml-1">
                              Tu respuesta
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {item.explanation && (
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 border-l-4 border-slate-400 dark:border-slate-600 p-3 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    <div className="font-bold text-slate-900 dark:text-white">Explicación</div>
                    <div className="whitespace-pre-wrap">{item.explanation}</div>
                  </div>
                )}

                {/* Proposal Section */}
                {item.questionId && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {myProposal && (
                      <div className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        Tu propuesta:{" "}
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {myProposal.status === "PENDING"
                            ? "pendiente"
                            : myProposal.status === "ACCEPTED"
                            ? "aceptada"
                            : "rechazada"}
                        </strong>
                        {myProposal.proposedLetter && (
                          <span>
                            {" "}
                            · opción <strong>{myProposal.proposedLetter}</strong>
                          </span>
                        )}
                      </div>
                    )}

                    <details className="group">
                      <summary className="cursor-pointer inline-flex items-center rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors">
                        Proponer respuesta alternativa
                      </summary>

                      <form
                        onSubmit={(e) =>
                          handleSubmitProposal(e, item.questionId, item.position, item.selectedLetter)
                        }
                        className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-3"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Creo que la opción correcta es
                          </label>
                          <select
                            value={form.letter}
                            onChange={(e) =>
                              updateFormField(item.questionId, "letter", e.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-amber-500 focus:outline-none transition-colors"
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
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Otra respuesta alternativa (texto)
                          </label>
                          <textarea
                            rows={2}
                            value={form.text}
                            onChange={(e) =>
                              updateFormField(item.questionId, "text", e.target.value)
                            }
                            placeholder="Si la respuesta correcta debería ser otra distinta de las opciones"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Motivo <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={2}
                            required
                            value={form.comment}
                            onChange={(e) =>
                              updateFormField(item.questionId, "comment", e.target.value)
                            }
                            placeholder="Explica por qué la respuesta es errónea o conflictiva"
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none transition-colors"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingProposalId === item.questionId}
                          className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                          {submittingProposalId === item.questionId
                            ? "Enviando..."
                            : "Enviar propuesta"}
                        </button>
                      </form>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={handleRepeat}
          disabled={repeating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {repeating ? "Iniciando..." : "Repetir simulacro"}
        </button>
        <Link
          href={`/simulacros/${mockExamId}`}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Ver historial
        </Link>
        <Link
          href="/simulacros"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Todos los simulacros
        </Link>
      </div>
    </div>
  );
}
