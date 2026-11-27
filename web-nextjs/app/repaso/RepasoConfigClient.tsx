"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExamType, ReviewFiltersResponse, ReviewSessionSummary } from "./types";

interface RepasoConfigClientProps {
  examTypes: ExamType[];
  activeSessions: ReviewSessionSummary[];
  initialCategories: string[];
  initialTags: string[];
  initialExamType?: string;
  initialOnlyDoubt?: boolean;
  initialOnlyFailed?: boolean;
  accessToken?: string;
}

export default function RepasoConfigClient({
  examTypes,
  activeSessions,
  initialCategories,
  initialTags,
  initialExamType = "",
  initialOnlyDoubt = false,
  initialOnlyFailed = false,
  accessToken,
}: RepasoConfigClientProps) {
  const router = useRouter();
  const [examTypeCode, setExamTypeCode] = useState(initialExamType);
  const [availableCategories, setAvailableCategories] = useState<string[]>(initialCategories);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlyDoubt, setOnlyDoubt] = useState<boolean>(initialOnlyDoubt);
  const [onlyFailed, setOnlyFailed] = useState<boolean>(initialOnlyFailed);
  const [loading, setLoading] = useState(false);
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBankChange(newCode: string) {
    setExamTypeCode(newCode);
    setSelectedCategories([]);
    setSelectedTags([]);
    setError(null);

    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const query = newCode ? `?examType=${encodeURIComponent(newCode)}` : "";
      const res = await fetch(`/api/review-sessions/filters${query}`, {
        method: "GET",
        headers,
      });
      if (res.ok) {
        const data: ReviewFiltersResponse = await res.json();
        setAvailableCategories(Array.isArray(data?.categories) ? data.categories : []);
        setAvailableTags(Array.isArray(data?.tags) ? data.tags : []);
      }
    } catch {}
  }

  function toggleCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleFinishActiveSession(sessionId: number) {
    setFinishingId(sessionId);
    setError(null);
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
      const res = await fetch(`/api/review-sessions/${sessionId}/finish`, {
        method: "POST",
        headers,
      });
      if (res.ok) {
        router.push(`/repaso/${sessionId}/result`);
      }
    } catch {
      setError("No se pudo finalizar el repaso.");
    } finally {
      setFinishingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!examTypeCode) {
      setError("Debes seleccionar un banco de preguntas.");
      return;
    }

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const payload: Record<string, unknown> = {
        examTypeCode,
        categories: selectedCategories,
        tags: selectedTags,
      };
      if (onlyDoubt) {
        payload.onlyDoubt = true;
      }
      if (onlyFailed) {
        payload.onlyFailed = true;
      }

      const res = await fetch("/api/review-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al iniciar el repaso");
      }

      const data = await res.json();
      router.push(`/repaso/${data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al iniciar el repaso"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-800 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {examTypes.length === 0 && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-blue-800 dark:text-blue-300">
          No tienes ningún banco de preguntas disponible. Si eres usuario normal, pide a un administrador que te asigne uno.
        </div>
      )}

      {activeSessions.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Continuar repaso anterior
          </h2>
          <div className="space-y-3">
            {activeSessions.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-sm text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                    <span>
                      {s.examTypeCode} - {s.examTypeName}
                    </span>
                    {s.onlyDoubt && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        En duda
                      </span>
                    )}
                    {s.onlyFailed && (
                      <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-300">
                        Fallidas
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {s.categories?.length
                      ? `Categorías: ${s.categories.join(", ")}`
                      : "Todas las categorías"}{" "}
                    ·{" "}
                    {s.tags?.length
                      ? `Tags: ${s.tags.map((t) => `#${t}`).join(", ")}`
                      : "Todos los tags"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {s.answeredCount} respondidas · {s.correctCount} acertadas ·{" "}
                    {s.totalMatchingQuestions} en el filtro
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/repaso/${s.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-700 shadow-xs transition-colors"
                  >
                    Continuar repaso
                  </Link>
                  <button
                    type="button"
                    disabled={finishingId === s.id}
                    onClick={() => handleFinishActiveSession(s.id)}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    Finalizar repaso
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Elige un banco de preguntas y filtra opcionalmente por varias categorías y tags. Las preguntas saldrán al azar una a una y podrás finalizar el repaso cuando quieras.
      </p>

      <form
        noValidate
        onSubmit={handleSubmit}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6"
      >
        {/* Banco de preguntas (obligatorio) */}
        <div>
          <label
            htmlFor="examTypeCode"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Banco de preguntas
          </label>
          <select
            id="examTypeCode"
            name="examTypeCode"
            value={examTypeCode}
            onChange={(e) => handleBankChange(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="">Selecciona un banco</option>
            {examTypes.map((et) => (
              <option key={et.id} value={et.code}>
                {et.code} - {et.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categorías (selección múltiple) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Categorías
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} seleccionadas`
                : "Todas las categorías"}
            </span>
          </div>
          {availableCategories.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todavía no hay categorías registradas.
            </p>
          )}
        </div>

        {/* Tags (selección múltiple) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Tags
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedTags.length > 0
                ? `${selectedTags.length} seleccionados`
                : "Todos los tags"}
            </span>
          </div>
          {availableTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((t) => {
                const isSelected = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => toggleTag(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todavía no hay tags registrados.
            </p>
          )}
        </div>

        {/* Filtro adicional: Preguntas en duda y/o fallidas */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Filtrar por estado de aprendizaje
            </span>
            <Link
              href="/dudas"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
            >
              Ver listado de preguntas en duda y fallidas &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="onlyDoubt"
              className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
            >
              <input
                id="onlyDoubt"
                name="onlyDoubt"
                type="checkbox"
                checked={onlyDoubt}
                onChange={(e) => setOnlyDoubt(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">
                <span className="font-medium block">
                  Incluir sólo preguntas en duda
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Preguntas en estado de duda (pendientes de 3 aciertos seguidos).
                </span>
              </span>
            </label>

            <label
              htmlFor="onlyFailed"
              className="flex items-start gap-3 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
            >
              <input
                id="onlyFailed"
                name="onlyFailed"
                type="checkbox"
                checked={onlyFailed}
                onChange={(e) => setOnlyFailed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-800 dark:text-slate-200">
                <span className="font-medium block">
                  Incluir sólo preguntas fallidas
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Preguntas falladas que todavía no has acertado ninguna vez.
                </span>
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {loading ? "Iniciando..." : "Empezar repaso"}
        </button>
      </form>
    </div>
  );
}
