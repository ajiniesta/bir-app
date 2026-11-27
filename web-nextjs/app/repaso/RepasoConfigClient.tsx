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
  accessToken?: string;
}

export default function RepasoConfigClient({
  examTypes,
  activeSessions,
  initialCategories,
  initialTags,
  accessToken,
}: RepasoConfigClientProps) {
  const router = useRouter();
  const [examTypeCode, setExamTypeCode] = useState("");
  const [availableCategories, setAvailableCategories] = useState<string[]>(initialCategories);
  const [availableTags, setAvailableTags] = useState<string[]>(initialTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

      const res = await fetch("/api/review-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          examTypeCode,
          categories: selectedCategories,
          tags: selectedTags,
        }),
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
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">
                    {s.examTypeCode} - {s.examTypeName}
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
