"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExamType, QuestionSummary, MockExamResponse } from "./types";

interface MockExamFormProps {
  initialExam?: MockExamResponse | null;
  examTypes: ExamType[];
  allQuestions: QuestionSummary[];
  accessToken?: string;
}

const MAX_QUESTIONS = 210;

function norm(str?: string | null): string {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function MockExamForm({
  initialExam,
  examTypes,
  allQuestions,
  accessToken,
}: MockExamFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialExam?.id);

  const [title, setTitle] = useState<string>(initialExam?.title || "");
  const [description, setDescription] = useState<string>(initialExam?.description || "");

  // Exam type ID
  const initialExamTypeId =
    initialExam?.examTypeId ||
    examTypes.find((et) => et.code === initialExam?.examTypeCode)?.id ||
    "";
  const [examTypeId, setExamTypeId] = useState<string | number>(initialExamTypeId);

  // Selected questions in ordered list
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    if (!initialExam?.questions) return [];
    return initialExam.questions.map((q) => q.questionId);
  });

  // Filters
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("");
  const [randomCount, setRandomCount] = useState<number>(10);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentExamType = examTypes.find((et) => String(et.id) === String(examTypeId));

  // Bank questions
  const bankQuestions = useMemo(() => {
    if (!currentExamType) return [];
    return allQuestions.filter(
      (q) =>
        (q.examTypeId && String(q.examTypeId) === String(currentExamType.id)) ||
        q.examTypeCode === currentExamType.code
    );
  }, [allQuestions, currentExamType]);

  // Distinct categories in this bank
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const q of bankQuestions) {
      if (q.category) set.add(q.category);
    }
    return Array.from(set).sort();
  }, [bankQuestions]);

  // Distinct tags in this bank
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const q of bankQuestions) {
      if (q.tag) set.add(q.tag);
    }
    return Array.from(set).sort();
  }, [bankQuestions]);

  // Filtered visible questions
  const visibleQuestions = useMemo(() => {
    const query = norm(searchText);
    return bankQuestions.filter((q) => {
      if (selectedCategory && q.category !== selectedCategory) {
        return false;
      }
      if (query && !norm(q.text).includes(query)) {
        return false;
      }
      return true;
    });
  }, [bankQuestions, selectedCategory, searchText]);

  function handleToggleQuestion(id: number) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= MAX_QUESTIONS) {
        setError(`No puedes seleccionar más de ${MAX_QUESTIONS} preguntas.`);
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleAddTagged() {
    if (!selectedTag) return;
    const tagged = bankQuestions.filter((q) => q.tag === selectedTag);
    const newIds = [...selectedIds];
    for (const q of tagged) {
      if (!newIds.includes(q.id) && newIds.length < MAX_QUESTIONS) {
        newIds.push(q.id);
      }
    }
    setSelectedIds(newIds);
  }

  function handleAddRandom() {
    const count = Math.max(1, Math.min(randomCount, MAX_QUESTIONS));
    const available = bankQuestions.filter((q) => !selectedIds.includes(q.id));
    // Fisher-Yates shuffle
    const shuffled = [...available];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const toAdd = shuffled.slice(0, Math.min(count, MAX_QUESTIONS - selectedIds.length));
    setSelectedIds([...selectedIds, ...toAdd.map((q) => q.id)]);
  }

  function handleSelectVisible() {
    const newIds = [...selectedIds];
    for (const q of visibleQuestions) {
      if (!newIds.includes(q.id) && newIds.length < MAX_QUESTIONS) {
        newIds.push(q.id);
      }
    }
    setSelectedIds(newIds);
  }

  function handleClearSelection() {
    setSelectedIds([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("El título es obligatorio.");
      return;
    }

    if (!examTypeId) {
      setError("Debes seleccionar un banco de preguntas.");
      return;
    }

    if (selectedIds.length === 0) {
      setError("Debes seleccionar al menos una pregunta para el simulacro.");
      return;
    }

    if (selectedIds.length > MAX_QUESTIONS) {
      setError(`No puedes seleccionar más de ${MAX_QUESTIONS} preguntas.`);
      return;
    }

    setSubmitting(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const body = {
        title: title.trim(),
        description: description.trim() || null,
        examTypeId: Number(examTypeId),
        questionIds: selectedIds,
      };

      const url = isEditing
        ? `/api/mock-exams/${initialExam?.id}`
        : `/api/mock-exams`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Error al guardar el simulacro");
      }

      const saved = await res.json();
      router.push(`/simulacros/${saved.id}`);
      router.refresh?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-300 border border-red-200 dark:border-red-900/60">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Título
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={200}
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Simulacro MIR 2026 - Bloque 1"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Descripción
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="examTypeId" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Banco de preguntas
        </label>
        <select
          id="examTypeId"
          name="examTypeId"
          required
          value={examTypeId}
          onChange={(e) => {
            setExamTypeId(e.target.value);
            setSelectedIds([]);
            setSelectedCategory(null);
            setSelectedTag("");
          }}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          <option value="">Selecciona un tipo de examen</option>
          {examTypes.map((et) => (
            <option key={et.id} value={et.id}>
              {et.code} - {et.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Todas las preguntas del simulacro deben ser de este banco.
        </p>
      </div>

      {!examTypeId ? (
        <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-4 text-sm text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
          Selecciona primero un banco de preguntas para ver sus preguntas.
        </div>
      ) : (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Preguntas</h2>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Seleccionadas: {selectedIds.length} / {MAX_QUESTIONS}
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Elige las preguntas en el orden en que quieres que aparezcan. Máximo {MAX_QUESTIONS} preguntas.
          </p>

          {/* Search bar */}
          <div>
            <label htmlFor="questionSearch" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Buscar
            </label>
            <input
              id="questionSearch"
              type="search"
              placeholder="Buscar por enunciado (ignora mayúsculas y tildes)..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Categories chips */}
          {categories.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Categorías</div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === null
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  Todas
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag selector */}
          {tags.length > 0 && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor="tagSelect" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Añadir por tag
                </label>
                <select
                  id="tagSelect"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="">Selecciona un tag...</option>
                  {tags.map((t) => (
                    <option key={t} value={t}>
                      #{t}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAddTagged}
                disabled={!selectedTag}
                className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Añadir todas del tag
              </button>
            </div>
          )}

          {/* Batch tools */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <div className="flex items-center gap-1">
              <label htmlFor="randomCount" className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nº:
              </label>
              <input
                id="randomCount"
                type="number"
                min={1}
                max={MAX_QUESTIONS}
                value={randomCount}
                onChange={(e) => setRandomCount(Number(e.target.value))}
                className="w-16 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={handleAddRandom}
              className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
            >
              Añadir al azar
            </button>
            <button
              type="button"
              onClick={handleSelectVisible}
              className="rounded-lg border border-blue-600 dark:border-blue-500 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
            >
              Seleccionar visibles
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-lg border border-red-300 dark:border-red-900/60 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              Vaciar selección
            </button>
          </div>

          {/* Question List */}
          <div className="max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/30">
            {visibleQuestions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                No hay preguntas que coincidan con los filtros.
              </div>
            ) : (
              visibleQuestions.map((q) => {
                const isChecked = selectedIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    htmlFor={`q_${q.id}`}
                    className="flex items-start gap-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      id={`q_${q.id}`}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleQuestion(q.id)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs text-slate-900 dark:text-slate-100 leading-snug">
                      <span className="font-semibold text-slate-600 dark:text-slate-400 mr-1.5">[{q.examTypeCode}]</span>
                      <span>{q.text}</span>
                      {q.category && (
                        <span className="text-slate-500 dark:text-slate-400 ml-1.5">({q.category})</span>
                      )}
                      {q.tag && (
                        <span className="ml-1.5 rounded bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-1 py-0.5 text-amber-700 dark:text-amber-300 font-medium">
                          #{q.tag}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {submitting
            ? "Guardando..."
            : isEditing
            ? "Guardar cambios"
            : "Crear simulacro"}
        </button>
        <Link
          href="/simulacros"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
