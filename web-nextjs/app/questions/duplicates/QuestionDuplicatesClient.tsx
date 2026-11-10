"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExamType,
  DuplicateQuestionsResponse,
  DuplicatePurgeResponse,
} from "./types";

interface QuestionDuplicatesClientProps {
  examTypes: ExamType[];
  selectedExamType: string;
  initialPreview: DuplicateQuestionsResponse | null;
  accessToken?: string;
}

export default function QuestionDuplicatesClient({
  examTypes,
  selectedExamType,
  initialPreview,
  accessToken,
}: QuestionDuplicatesClientProps) {
  const router = useRouter();
  const [examType, setExamType] = useState(selectedExamType);
  const [confirmed, setConfirmed] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Purge accumulator
  const [purgeSummary, setPurgeSummary] = useState<DuplicatePurgeResponse | null>(null);
  const [isDone, setIsDone] = useState(false);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!examType) return;
    setConfirmed(false);
    setIsDone(false);
    setPurgeSummary(null);
    setErrorMessage(null);
    router.push(`/questions/duplicates?examType=${encodeURIComponent(examType)}`);
  }

  async function handlePurge() {
    if (!confirmed || !selectedExamType) return;

    setIsPurging(true);
    setErrorMessage(null);
    setIsDone(false);
    setProgress(0);

    const totalGroups = initialPreview?.totalGroups || 0;
    let accumulated: DuplicatePurgeResponse = {
      groupsProcessed: 0,
      deleted: 0,
      mockExamLinksRepointed: 0,
      mockExamLinksRemoved: 0,
      positionsRenumbered: 0,
      proposalsRepointed: 0,
      proposalsDeleted: 0,
      sessionItemsRepointed: 0,
      remaining: 1,
      notes: [],
    };

    try {
      let remaining = 1;

      while (remaining > 0) {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch("/api/questions/duplicates/purge", {
          method: "POST",
          headers,
          body: JSON.stringify({
            examType: selectedExamType,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Error en la purga (HTTP ${res.status})`);
        }

        const batchResult: DuplicatePurgeResponse = await res.json();
        accumulated = {
          groupsProcessed: accumulated.groupsProcessed + (batchResult.groupsProcessed || 0),
          deleted: accumulated.deleted + (batchResult.deleted || 0),
          mockExamLinksRepointed: accumulated.mockExamLinksRepointed + (batchResult.mockExamLinksRepointed || 0),
          mockExamLinksRemoved: accumulated.mockExamLinksRemoved + (batchResult.mockExamLinksRemoved || 0),
          positionsRenumbered: accumulated.positionsRenumbered + (batchResult.positionsRenumbered || 0),
          proposalsRepointed: accumulated.proposalsRepointed + (batchResult.proposalsRepointed || 0),
          proposalsDeleted: accumulated.proposalsDeleted + (batchResult.proposalsDeleted || 0),
          sessionItemsRepointed: accumulated.sessionItemsRepointed + (batchResult.sessionItemsRepointed || 0),
          remaining: batchResult.remaining || 0,
          notes: [...accumulated.notes, ...(batchResult.notes || [])],
        };

        remaining = batchResult.remaining || 0;
        const currentPercent =
          totalGroups > 0
            ? Math.min(100, Math.round((accumulated.groupsProcessed / totalGroups) * 100))
            : 100;

        setProgress(currentPercent);
        setStatusText(
          `Grupos procesados: ${accumulated.groupsProcessed}${
            remaining > 0 ? ` · quedan ${remaining}` : ""
          }.`
        );
        setPurgeSummary({ ...accumulated });
      }

      setProgress(100);
      setStatusText("Limpieza terminada.");
      setIsDone(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error durante la purga de duplicados.");
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Preguntas duplicadas</h1>
          <p className="text-sm text-gray-600 mt-1">
            Detecta y limpia preguntas con el mismo enunciado y opciones en cada banco de preguntas.
          </p>
        </div>
        <Link
          href="/questions"
          className="rounded-md border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
        >
          Volver
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Filter Form */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="examType" className="block text-xs font-semibold text-gray-700 mb-1">
              Banco de preguntas
            </label>
            <select
              id="examType"
              name="examType"
              required
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Elige un banco —</option>
              {examTypes.map((et) => (
                <option key={et.id} value={et.code}>
                  {et.name} ({et.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Buscar duplicadas
            </button>
            <Link
              href="/questions/duplicates"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Preview Section */}
      {initialPreview && (
        <div className="space-y-6">
          {initialPreview.totalGroups === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center text-sm text-green-900">
              No hay preguntas duplicadas en este banco.
            </div>
          ) : (
            <>
              {/* Purge Control Card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900">Resumen</h2>
                <p className="text-sm text-gray-800">
                  <strong>
                    {initialPreview.totalGroups}{" "}
                    {initialPreview.totalGroups === 1 ? "grupo" : "grupos"}
                  </strong>{" "}
                  de preguntas equivalentes; se borrarían{" "}
                  <strong>
                    {initialPreview.totalDuplicates}{" "}
                    {initialPreview.totalDuplicates === 1 ? "pregunta" : "preguntas"}
                  </strong>
                  .
                </p>
                <p className="text-xs text-gray-500">
                  Se conserva en cada grupo la pregunta más completa (con explicación, luego con más opciones y, a igualdad, la más antigua). El historial de las que se borran (simulacros, propuestas y sesiones libres) se re-apunta a la conservada.
                </p>

                {initialPreview.truncated && (
                  <p className="text-xs text-gray-500">
                    Se muestran solo los primeros grupos; la limpieza los procesa todos por tandas.
                  </p>
                )}

                {/* Progress bar while purging */}
                {(isPurging || isDone) && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-700">{statusText}</span>
                      <span className="font-bold text-blue-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          isDone ? "bg-green-600" : "bg-blue-600 animate-pulse"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Purge Results Summary */}
                {isDone && purgeSummary && (
                  <div className="rounded-lg bg-green-50 p-4 border border-green-200 text-xs text-green-900 space-y-2">
                    <p className="font-bold text-sm">Limpieza terminada.</p>
                    <ul className="space-y-1">
                      <li>
                        Preguntas borradas: <strong>{purgeSummary.deleted}</strong> de{" "}
                        {initialPreview.totalDuplicates}
                      </li>
                      <li>Grupos procesados: {purgeSummary.groupsProcessed}</li>
                      <li>
                        Apariciones en simulacros re-apuntadas: {purgeSummary.mockExamLinksRepointed}{" "}
                        (retiradas por duplicado: {purgeSummary.mockExamLinksRemoved})
                      </li>
                      <li>
                        Propuestas re-apuntadas: {purgeSummary.proposalsRepointed} (borradas por conflicto:{" "}
                        {purgeSummary.proposalsDeleted})
                      </li>
                      <li>
                        Ítems de sesiones libres re-apuntados: {purgeSummary.sessionItemsRepointed}
                      </li>
                    </ul>
                  </div>
                )}

                {/* Purge trigger form when not yet done */}
                {!isDone && (
                  <div className="space-y-4 pt-2 border-t border-gray-100">
                    <div className="rounded-lg bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900">
                      <strong>Esta acción no se puede deshacer.</strong> Se borrarán{" "}
                      <strong>{initialPreview.totalDuplicates}</strong> preguntas del banco{" "}
                      <span className="font-semibold">{selectedExamType}</span>.
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                        disabled={isPurging}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-gray-700">
                        Entiendo que las preguntas duplicadas se eliminarán definitivamente.
                      </span>
                    </label>

                    <div>
                      <button
                        type="button"
                        onClick={handlePurge}
                        disabled={!confirmed || isPurging}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
                      >
                        {isPurging ? "Borrando duplicadas…" : "Borrar duplicadas"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Duplicate Question Groups Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 font-bold text-sm text-gray-900">
                  Grupos de preguntas equivalentes
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-4 w-5/12">Enunciado</th>
                        <th className="py-3 px-4">Banco</th>
                        <th className="py-3 px-4">Se conserva</th>
                        <th className="py-3 px-4">Se borraría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {initialPreview.groups.map((group, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="py-3 px-4 font-medium text-gray-900 leading-snug">
                            {group.text}
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-700">
                            {group.examTypeCode}
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <Link
                              href={`/questions/${group.keepId}`}
                              className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800 hover:bg-green-200 transition"
                            >
                              #{group.keepId}
                            </Link>
                            <div className="text-[11px] text-gray-500">{group.keepReason}</div>
                          </td>
                          <td className="py-3 px-4 space-y-2">
                            {group.duplicates.map((dup) => (
                              <div key={dup.id} className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Link
                                    href={`/questions/${dup.id}`}
                                    className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-bold text-gray-800 hover:bg-gray-300 transition"
                                  >
                                    #{dup.id}
                                  </Link>
                                  <span className="text-[11px] text-gray-500">
                                    {dup.category || "Sin categoría"} · {dup.tag || "Sin tag"} · {dup.optionCount} opciones
                                    {dup.hasExplanation && " · con explicación"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {dup.inMockExam && (
                                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                                      en simulacro
                                    </span>
                                  )}
                                  {dup.hasProposals && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                      con propuestas
                                    </span>
                                  )}
                                  {dup.inFreeSessions && (
                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-800">
                                      en sesiones
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Similar Groups Notice */}
              {initialPreview.similarGroups?.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 space-y-3 text-xs text-blue-900">
                  <p className="font-bold text-sm">
                    Mismo enunciado pero con opciones distintas (no se borran, revísalos a mano):
                  </p>
                  <ul className="space-y-1.5">
                    {initialPreview.similarGroups.map((sim, idx) => (
                      <li key={idx} className="flex flex-wrap items-center gap-1">
                        <span className="font-semibold">{sim.examTypeCode}:</span>
                        <span>{sim.text}</span>
                        <span className="text-gray-500">
                          (ids{" "}
                          {sim.questionIds.map((qid, qidx) => (
                            <span key={qid}>
                              <Link
                                href={`/questions/${qid}`}
                                className="font-bold underline hover:text-blue-700"
                              >
                                {qid}
                              </Link>
                              {qidx < sim.questionIds.length - 1 && ", "}
                            </span>
                          ))}
                          )
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
