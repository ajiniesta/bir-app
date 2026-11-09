"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionPageResponse, ExamType } from "./types";

interface QuestionsListClientProps {
  initialData: QuestionPageResponse;
  examTypes: ExamType[];
  categories: string[];
  tags: string[];
  currentQuery: {
    q: string;
    examType: string;
    category: string;
    tag: string;
    page: number;
  };
  accessToken?: string;
}

const PAGE_WINDOW = 5;

function getPageNumbers(current: number, totalPages: number, windowSize: number = PAGE_WINDOW): number[] {
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

export default function QuestionsListClient({
  initialData,
  examTypes,
  categories,
  tags,
  currentQuery,
  accessToken,
}: QuestionsListClientProps) {
  const router = useRouter();
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [q, setQ] = useState(currentQuery.q);
  const [selectedExamType, setSelectedExamType] = useState(currentQuery.examType);
  const [selectedCategory, setSelectedCategory] = useState(currentQuery.category);
  const [selectedTag, setSelectedTag] = useState(currentQuery.tag);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs and reset deleted items when query/page changes
  useEffect(() => {
    setQ(currentQuery.q);
    setSelectedExamType(currentQuery.examType);
    setSelectedCategory(currentQuery.category);
    setSelectedTag(currentQuery.tag);
    setDeletedIds([]);
  }, [currentQuery.q, currentQuery.examType, currentQuery.category, currentQuery.tag, currentQuery.page]);

  const questions = (initialData.items || []).filter(
    (item) => !deletedIds.includes(item.id)
  );

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (selectedExamType) params.set("examType", selectedExamType);
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedTag) params.set("tag", selectedTag);
    params.set("page", "1");
    router.push(`/questions?${params.toString()}`);
  }

  async function handleDelete(id: number) {
    if (!window.confirm("¿Eliminar esta pregunta?")) {
      return;
    }

    try {
      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al eliminar la pregunta");
      }

      setDeletedIds((prev) => [...prev, id]);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  const { page, totalPages, total, size } = initialData;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = total === 0 ? 0 : Math.min(total, page * size);

  function buildPageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (currentQuery.q) params.set("q", currentQuery.q);
    if (currentQuery.examType) params.set("examType", currentQuery.examType);
    if (currentQuery.category) params.set("category", currentQuery.category);
    if (currentQuery.tag) params.set("tag", currentQuery.tag);
    params.set("page", targetPage.toString());
    return `/questions?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter form */}
      <form
        onSubmit={handleFilterSubmit}
        className="bg-white p-4 rounded-xl shadow-sm border border-gray-200"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label htmlFor="q" className="block text-xs font-medium text-gray-700 mb-1">
              Buscar en el enunciado
            </label>
            <input
              type="search"
              id="q"
              name="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Texto de la pregunta..."
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="examType" className="block text-xs font-medium text-gray-700 mb-1">
              Banco
            </label>
            <select
              id="examType"
              name="examType"
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
            <label htmlFor="tag" className="block text-xs font-medium text-gray-700 mb-1">
              Tag
            </label>
            <select
              id="tag"
              name="tag"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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

          <div className="flex gap-2 lg:col-span-5 justify-end pt-2">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none"
            >
              Buscar
            </button>
            <Link
              href="/questions"
              className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Limpiar
            </Link>
          </div>
        </div>
      </form>

      {/* Pagination summary info */}
      {total > 0 && (
        <div className="flex justify-between items-center text-xs text-gray-500">
          <span>
            Mostrando {from}–{to} de {total} preguntas
          </span>
          <span>
            Página {page} de {totalPages}
          </span>
        </div>
      )}

      {/* Questions list / Empty state */}
      {questions.length === 0 ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-800">
          No hay preguntas disponibles.
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((qItem) => (
            <div
              key={qItem.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                  {qItem.examTypeCode || "N/A"}
                </span>
                <div className="text-right space-x-1.5">
                  {qItem.category && (
                    <span className="text-xs text-gray-500 font-medium">
                      {qItem.category}
                    </span>
                  )}
                  {qItem.tag && (
                    <span className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                      #{qItem.tag}
                    </span>
                  )}
                </div>
              </div>

              <p className="text-sm font-medium text-gray-900 mb-4 whitespace-pre-wrap">
                {qItem.text}
              </p>

              <div className="flex gap-2 items-center">
                <Link
                  href={`/questions/${qItem.id}`}
                  className="rounded border border-blue-600 bg-white px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                >
                  Ver
                </Link>
                <Link
                  href={`/questions/${qItem.id}/edit`}
                  className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(qItem.id)}
                  className="rounded border border-red-300 bg-white px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav aria-label="Paginación de preguntas" className="flex justify-center items-center gap-1 pt-4">
          <Link
            href={buildPageUrl(Math.max(1, page - 1))}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              page <= 1
                ? "text-gray-400 pointer-events-none"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Anterior
          </Link>

          {getPageNumbers(page, totalPages).map((pNum) => (
            <Link
              key={pNum}
              href={buildPageUrl(pNum)}
              className={`rounded px-3 py-1.5 text-sm font-medium ${
                pNum === page
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {pNum}
            </Link>
          ))}

          <Link
            href={buildPageUrl(Math.min(totalPages, page + 1))}
            className={`rounded px-3 py-1.5 text-sm font-medium ${
              page >= totalPages
                ? "text-gray-400 pointer-events-none"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            Siguiente
          </Link>
        </nav>
      )}
    </div>
  );
}
