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
      setProposalError(err instanceof Error ? err.message : "Error al enviar propuesta");
    } finally {
      setSubmittingProposalId(null);
    }
  }

  async function handleRepeat() {
    setRepeating(true);
    setRepeatError(null);

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
        throw new Error(errData?.error || "No se pudo iniciar el simulacro");
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
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 border border-green-200">
          {proposalSuccess}
        </div>
      )}

      {proposalError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {proposalError}
        </div>
      )}

      {repeatError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {repeatError}
        </div>
      )}

      {/* Header */}
      <div>
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-800 mb-2">
          {attempt.examTypeCode}
        </span>
        <h1 className="text-2xl font-bold text-gray-900">{attempt.mockExamTitle}</h1>
        {attempt.finishedAt && (
          <p className="text-xs text-gray-500 mt-1">
            Entregado el {formatDate(attempt.finishedAt)}
          </p>
        )}
      </div>

      {/* Score Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs uppercase font-semibold text-gray-500">Preguntas</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{attempt.totalQuestions}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs uppercase font-semibold text-gray-500">Acertadas</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{attempt.correctCount}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs uppercase font-semibold text-gray-500">En blanco</div>
          <div className="text-3xl font-bold text-gray-500 mt-1">{blankCount}</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="text-xs uppercase font-semibold text-gray-500">Nota</div>
          <div className="text-3xl font-bold text-blue-600 mt-1">
            {attempt.accuracy.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Review Section */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Revisión</h2>
        <div className="space-y-4">
          {attempt.items.map((item) => {
            const myProposal = item.questionId ? proposals[item.questionId] : undefined;
            const form = proposalForms[item.questionId] || { letter: "", text: "", comment: "" };

            return (
              <div
                key={item.position}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-6 h-6 rounded bg-gray-100 text-xs font-bold text-gray-700">
                      {item.position}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">
                        {item.questionText}
                      </div>
                      {item.tag && (
                        <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                          #{item.tag}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    {!item.answered ? (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                        En blanco
                      </span>
                    ) : item.correct ? (
                      <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                        Correcta
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
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

                    let rowStyle = "border-gray-200 bg-gray-50/50";
                    if (isCorrect) {
                      rowStyle = "border-green-200 bg-green-50 text-green-900 font-medium";
                    } else if (isSelected && !isCorrect) {
                      rowStyle = "border-red-200 bg-red-50 text-red-900";
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
                            <span className="rounded bg-green-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
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
                  <div className="rounded-lg bg-gray-50 border-l-4 border-gray-400 p-3 text-xs text-gray-700 space-y-1">
                    <div className="font-bold text-gray-900">Explicación</div>
                    <div className="whitespace-pre-wrap">{item.explanation}</div>
                  </div>
                )}

                {/* Proposal Section */}
                {item.questionId && (
                  <div className="pt-2 border-t border-gray-100">
                    {myProposal && (
                      <div className="text-xs text-gray-600 mb-2">
                        Tu propuesta:{" "}
                        <strong className="font-semibold text-gray-900">
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
                      <summary className="cursor-pointer inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition">
                        Proponer respuesta alternativa
                      </summary>

                      <form
                        onSubmit={(e) =>
                          handleSubmitProposal(e, item.questionId, item.position, item.selectedLetter)
                        }
                        className="mt-3 p-3 bg-amber-50/50 rounded-lg border border-amber-200 space-y-3"
                      >
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Creo que la opción correcta es
                          </label>
                          <select
                            value={form.letter}
                            onChange={(e) =>
                              updateFormField(item.questionId, "letter", e.target.value)
                            }
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-amber-500 focus:outline-none"
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
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Otra respuesta alternativa (texto)
                          </label>
                          <textarea
                            rows={2}
                            value={form.text}
                            onChange={(e) =>
                              updateFormField(item.questionId, "text", e.target.value)
                            }
                            placeholder="Si la respuesta correcta debería ser otra distinta de las opciones"
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">
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
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-900 focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingProposalId === item.questionId}
                          className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition disabled:opacity-50"
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
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={handleRepeat}
          disabled={repeating}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
        >
          {repeating ? "Iniciando..." : "Repetir simulacro"}
        </button>
        <Link
          href={`/simulacros/${mockExamId}`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Ver historial
        </Link>
        <Link
          href="/simulacros"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Todos los simulacros
        </Link>
      </div>
    </div>
  );
}
