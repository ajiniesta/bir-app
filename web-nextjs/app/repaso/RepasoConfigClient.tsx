"use client";

import { useState, useMemo } from "react";
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

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const [availableCategories, setAvailableCategories] =
    useState<string[]>(initialCategories);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [tagQuery, setTagQuery] = useState("");
  const [onlyDoubt, setOnlyDoubt] = useState<boolean>(initialOnlyDoubt);
  const [onlyFailed, setOnlyFailed] = useState<boolean>(initialOnlyFailed);
  const [loading, setLoading] = useState(false);
  const [finishingId, setFinishingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleBankChange(newCode: string) {
    setExamTypeCode(newCode);
    setSelectedCategories([]);
    setSelectedTags([]);
    setCategoryQuery("");
    setTagQuery("");
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
        setAvailableCategories(
          Array.isArray(data?.categories) ? data.categories : []
        );
        setAvailableTags(Array.isArray(data?.tags) ? data.tags : []);
      }
    } catch {}
  }

  const matchingCategories = useMemo(() => {
    const q = normalizeSearch(categoryQuery);
    if (!q) return [];
    return availableCategories.filter(
      (cat) =>
        !selectedCategories.includes(cat) &&
        normalizeSearch(cat).includes(q)
    );
  }, [availableCategories, selectedCategories, categoryQuery]);

  const matchingTags = useMemo(() => {
    const q = normalizeSearch(tagQuery);
    if (!q) return [];
    return availableTags.filter(
      (t) =>
        !selectedTags.includes(t) &&
        normalizeSearch(t).includes(q)
    );
  }, [availableTags, selectedTags, tagQuery]);

  function addCategory(cat: string) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev : [...prev, cat]
    );
    setCategoryQuery("");
  }

  function removeCategory(cat: string) {
    setSelectedCategories((prev) => prev.filter((c) => c !== cat));
  }

  function handleCategoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && categoryQuery.trim()) {
      e.preventDefault();
      if (matchingCategories.length > 0) {
        addCategory(matchingCategories[0]);
      }
    }
  }

  function addTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
    setTagQuery("");
  }

  function removeTag(tag: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagQuery.trim()) {
      e.preventDefault();
      if (matchingTags.length > 0) {
        addTag(matchingTags[0]);
      }
    }
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
        err instanceof Error
          ? err.message
          : "Error inesperado al iniciar el repaso"
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
        Elige un banco de preguntas y filtra opcionalmente por varias categorías y tags escribiendo en los buscadores. Si no seleccionas ninguna, se incluirán todas.
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

        {/* Categorías (textbox con autocompletado según el banco) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="categoryInput"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Categorías
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} seleccionadas`
                : "Todas las categorías"}
            </span>
          </div>

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 text-xs font-medium text-blue-800 dark:text-blue-200"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(cat)}
                    aria-label={`Quitar categoría ${cat}`}
                    className="text-blue-600 dark:text-blue-300 hover:text-blue-900 dark:hover:text-white font-bold leading-none focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            id="categoryInput"
            type="text"
            value={categoryQuery}
            onChange={(e) => setCategoryQuery(e.target.value)}
            onKeyDown={handleCategoryKeyDown}
            placeholder="Escribe para buscar y añadir categorías (vacío = todas)..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />

          {categoryQuery.trim().length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 max-h-48 overflow-y-auto">
              {matchingCategories.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {matchingCategories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => addCategory(cat)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-0.5">
                  No hay categorías que coincidan con «{categoryQuery}».
                </p>
              )}
            </div>
          )}
        </div>

        {/* Tags (textbox con autocompletado según el banco) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="tagInput"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Tags
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {selectedTags.length > 0
                ? `${selectedTags.length} seleccionados`
                : "Todos los tags"}
            </span>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedTags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Quitar tag ${t}`}
                    className="text-amber-700 dark:text-amber-300 hover:text-amber-950 dark:hover:text-white font-bold leading-none focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            id="tagInput"
            type="text"
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Escribe para buscar y añadir tags (vacío = todos)..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />

          {tagQuery.trim().length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-2 max-h-48 overflow-y-auto">
              {matchingTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {matchingTags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addTag(t)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-0.5">
                  No hay tags que coincidan con «{tagQuery}».
                </p>
              )}
            </div>
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
