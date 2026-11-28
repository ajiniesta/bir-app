"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionPageResponse, ExamType } from "@/app/questions/types";
import QuestionStatsButton from "@/app/components/QuestionStatsButton";
import { getQuestionTags } from "@/app/lib/questionTags";

interface DoubtQuestionsClientProps {
  initialData: QuestionPageResponse;
  examTypes: ExamType[];
  categories: string[];
  tags: string[];
  currentQuery: {
    q: string;
    examType: string;
    category: string;
    tag: string;
    status: string;
    page: number;
  };
  accessToken?: string;
}

const PAGE_WINDOW = 5;

function getPageNumbers(
  current: number,
  totalPages: number,
  windowSize: number = PAGE_WINDOW
): number[] {
  if (totalPages <= 1) return [];
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end = Math.min(totalPages, start + windowSize - 1);
  if (end - start + 1 < windowSize) {
    start = Math.max(1, end - windowSize + 1);
  }
  const pages: number[] = [];
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export default function DoubtQuestionsClient({
  initialData,
  examTypes,
  categories,
  tags,
  currentQuery,
  accessToken,
}: DoubtQuestionsClientProps) {
  const router = useRouter();
  const [q, setQ] = useState(currentQuery.q);
  const [selectedExamType, setSelectedExamType] = useState(currentQuery.examType);
  const [selectedCategory, setSelectedCategory] = useState(currentQuery.category);
  const [selectedTag, setSelectedTag] = useState(currentQuery.tag);
  const [selectedStatus, setSelectedStatus] = useState(currentQuery.status);
  const [startingReview, setStartingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQ(currentQuery.q);
    setSelectedExamType(currentQuery.examType);
    setSelectedCategory(currentQuery.category);
    setSelectedTag(currentQuery.tag);
    setSelectedStatus(currentQuery.status);
  }, [
    currentQuery.q,
    currentQuery.examType,
    currentQuery.category,
    currentQuery.tag,
    currentQuery.status,
    currentQuery.page,
  ]);

  const questions = initialData.items || [];
  const { page, totalPages, total, size } = initialData;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = total === 0 ? 0 : Math.min(total, page * size);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (selectedExamType) params.set("examType", selectedExamType);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTag) params.set("tag", selectedTag);
    if (selectedStatus) params.set("status", selectedStatus);
    params.set("page", "1");
    router.push(`/dudas?${params.toString()}`);
  }

  function buildPageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (currentQuery.q) params.set("q", currentQuery.q);
    if (currentQuery.examType) params.set("examType", currentQuery.examType);
    if (currentQuery.category) params.set("category", currentQuery.category);
    if (currentQuery.tag) params.set("tag", currentQuery.tag);
    if (currentQuery.status) params.set("status", currentQuery.status);
    params.set("page", targetPage.toString());
    return `/dudas?${params.toString()}`;
  }

  async function handleStartDoubtReview() {
    setError(null);
    const activeStatus = selectedStatus || currentQuery.status || "";
    const wantDoubt = activeStatus === "" || activeStatus === "DOUBT";
    const wantFailed = activeStatus === "" || activeStatus === "FAILED";

    const targetBank =
      selectedExamType ||
      currentQuery.examType ||
      (examTypes.length === 1 ? examTypes[0].code : "");

    if (!targetBank) {
      const qs = new URLSearchParams();
      if (wantDoubt) qs.set("onlyDoubt", "true");
      if (wantFailed) qs.set("onlyFailed", "true");
      router.push(`/repaso?${qs.toString()}`);
      return;
    }

    setStartingReview(true);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const categoryList =
        selectedCategory && selectedCategory !== "__NONE__"
          ? [selectedCategory]
          : [];
      const tagList =
        selectedTag && selectedTag !== "__NONE__" ? [selectedTag] : [];

      const payload: Record<string, unknown> = {
        examTypeCode: targetBank,
        categories: categoryList,
        tags: tagList,
      };
      if (wantDoubt) payload.onlyDoubt = true;
      if (wantFailed) payload.onlyFailed = true;

      const res = await fetch("/api/review-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al iniciar la sesión de repaso");
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
      setStartingReview(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Preguntas en duda y fallidas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Consulta tus preguntas en estado de duda o fallidas e inicia un repaso con ellas.
          </p>
        </div>
        <button
          type="button"
          disabled={startingReview}
          onClick={handleStartDoubtReview}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
        >
          {startingReview ? "Iniciando repaso..." : "Iniciar sesión de repaso"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-800 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Filter form */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="q"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Buscar en el enunciado
            </label>
            <input
              type="search"
              id="q"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Texto de la pregunta..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Estado
            </label>
            <select
              id="status"
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todas (En duda y fallidas)</option>
              <option value="DOUBT">Solo en duda</option>
              <option value="FAILED">Solo fallidas</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="examType"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Banco
            </label>
            <select
              id="examType"
              name="examType"
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              {examTypes.map((et) => (
                <option key={et.id} value={et.code}>
                  {et.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todas</option>
              <option value="__NONE__">Sin categoría</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="tag"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Tag
            </label>
            <select
              id="tag"
              name="tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              <option value="__NONE__">Sin tag</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 lg:col-span-6 justify-end pt-2">
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-none transition-colors"
            >
              Buscar
            </button>
            <Link
              href="/dudas"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Pagination summary info */}
      {total > 0 && (
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
          <span>
            Mostrando {from}–{to} de {total} preguntas
          </span>
          <span>
            Página {page} de {totalPages}
          </span>
        </div>
      )}

      {/* Doubt/Failed questions list / Empty state */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50 dark:bg-blue-950/40 p-6 text-center text-sm text-blue-900 dark:text-blue-300">
          No tienes preguntas en duda o fallidas para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((qItem) => {
            const isFailed = qItem.learningStatus === "FAILED";
            return (
              <div
                key={qItem.id}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-5 transition-all hover:shadow-md dark:hover:border-slate-700"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {qItem.examTypeCode || "N/A"}
                    </span>
                    {isFailed ? (
                      <span className="inline-flex items-center rounded-md bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">
                        Fallida
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        En duda
                      </span>
                    )}
                  </div>
                  <div className="text-right flex flex-wrap justify-end items-center gap-1.5">
                    {qItem.category && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {qItem.category}
                      </span>
                    )}
                    {getQuestionTags(qItem).map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4 whitespace-pre-wrap">
                  {qItem.text}
                </p>

                <div className="flex flex-wrap gap-2 items-center">
                  <Link
                    href={`/dudas/${qItem.id}`}
                    className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Ver detalle
                  </Link>
                  <QuestionStatsButton
                    questionId={qItem.id}
                    accessToken={accessToken}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Paginación de preguntas en duda"
          className="flex justify-center items-center gap-1 pt-4"
        >
          <Link
            href={buildPageUrl(Math.max(1, page - 1))}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              page <= 1
                ? "text-slate-400 pointer-events-none"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Anterior
          </Link>

          {getPageNumbers(page, totalPages).map((pNum) => (
            <Link
              key={pNum}
              href={buildPageUrl(pNum)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pNum === page
                  ? "bg-blue-600 text-white"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {pNum}
            </Link>
          ))}

          <Link
            href={buildPageUrl(Math.min(totalPages, page + 1))}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              page >= totalPages
                ? "text-slate-400 pointer-events-none"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            Siguiente
          </Link>
        </nav>
      )}
    </div>
  );
}
