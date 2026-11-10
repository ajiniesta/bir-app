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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Preguntas duplicadas</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Detecta y limpia preguntas con el mismo enunciado y opciones en cada banco de preguntas.
          </p>
        </div>
        <Link
          href="/questions"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
        >
          Volver
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {errorMessage}
        </div>
      )}

      {/* Filter Form */}
      <form
        onSubmit={handleSearchSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <label htmlFor="examType" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Banco de preguntas
            </label>
            <select
              id="examType"
              name="examType"
              required
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition"
            >
              Buscar duplicadas
            </button>
            <Link
              href="/questions/duplicates"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
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
            <div className="rounded-2xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-6 text-center text-sm text-green-900 dark:text-green-300">
              No hay preguntas duplicadas en este banco.
            </div>
          ) : (
            <>
              {/* Purge Control Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Resumen</h2>
                <p className="text-sm text-slate-800 dark:text-slate-200">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Se conserva en cada grupo la pregunta más completa (con explicación, luego con más opciones y, a igualdad, la más antigua). El historial de las que se borran (simulacros, propuestas y sesiones libres) se re-apunta a la conservada.
                </p>

                {initialPreview.truncated && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Se muestran solo los primeros grupos; la limpieza los procesa todos por tandas.
                  </p>
                )}

                {/* Progress bar while purging */}
                {(isPurging || isDone) && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{statusText}</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
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
                  <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-900/50 text-xs text-green-900 dark:text-green-300 space-y-2">
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
                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300">
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
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-xs text-slate-700 dark:text-slate-300">
                        Entiendo que las preguntas duplicadas se eliminarán definitivamente.
                      </span>
                    </label>

                    <div>
                      <button
                        type="button"
                        onClick={handlePurge}
                        disabled={!confirmed || isPurging}
                        className="rounded-lg bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
                      >
                        {isPurging ? "Borrando duplicadas…" : "Borrar duplicadas"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Duplicate Question Groups Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
                  Grupos de preguntas equivalentes
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-left">
                      <tr>
                        <th className="py-3 px-4 w-5/12">Enunciado</th>
                        <th className="py-3 px-4">Banco</th>
                        <th className="py-3 px-4">Se conserva</th>
                        <th className="py-3 px-4">Se borraría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {initialPreview.groups.map((group, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100 leading-snug">
                            {group.text}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                            {group.examTypeCode}
                          </td>
                          <td className="py-3 px-4 space-y-1">
                            <Link
                              href={`/questions/${group.keepId}`}
                              className="inline-flex items-center rounded-md bg-green-100 dark:bg-green-950/50 px-2 py-0.5 text-xs font-bold text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition"
                            >
                              #{group.keepId}
                            </Link>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">{group.keepReason}</div>
                          </td>
                          <td className="py-3 px-4 space-y-2">
                            {group.duplicates.map((dup) => (
                              <div key={dup.id} className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Link
                                    href={`/questions/${dup.id}`}
                                    className="inline-flex items-center rounded-md bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-[11px] font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                  >
                                    #{dup.id}
                                  </Link>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {dup.category || "Sin categoría"} · {dup.tag || "Sin tag"} · {dup.optionCount} opciones
                                    {dup.hasExplanation && " · con explicación"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {dup.inMockExam && (
                                    <span className="rounded-md bg-blue-100 dark:bg-blue-950/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:text-blue-300">
                                      en simulacro
                                    </span>
                                  )}
                                  {dup.hasProposals && (
                                    <span className="rounded-md bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300">
                                      con propuestas
                                    </span>
                                  )}
                                  {dup.inFreeSessions && (
                                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-800 dark:text-slate-300">
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
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 space-y-3 text-xs text-blue-900 dark:text-blue-300">
                  <p className="font-bold text-sm">
                    Mismo enunciado pero con opciones distintas (no se borran, revísalos a mano):
                  </p>
                  <ul className="space-y-1.5">
                    {initialPreview.similarGroups.map((sim, idx) => (
                      <li key={idx} className="flex flex-wrap items-center gap-1">
                        <span className="font-semibold">{sim.examTypeCode}:</span>
                        <span>{sim.text}</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          (ids{" "}
                          {sim.questionIds.map((qid, qidx) => (
                            <span key={qid}>
                              <Link
                                href={`/questions/${qid}`}
                                className="font-bold underline hover:text-blue-700 dark:hover:text-blue-400"
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
