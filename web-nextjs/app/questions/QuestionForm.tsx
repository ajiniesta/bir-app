"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QuestionDetailResponse, ExamType } from "./types";

interface QuestionFormProps {
  initialData?: QuestionDetailResponse | null;
  examTypes: ExamType[];
  tags: string[];
  accessToken?: string;
}

interface AnswerOptionDraft {
  letter: string;
  text: string;
}

const LETTERS = ["A", "B", "C", "D"];

export default function QuestionForm({
  initialData,
  examTypes,
  tags,
  accessToken,
}: QuestionFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  // Determine initial examTypeId from examTypeCode or match
  const initialExamTypeId = initialData
    ? examTypes.find((et) => et.code === initialData.examTypeCode)?.id?.toString() || ""
    : "";

  const [examTypeId, setExamTypeId] = useState(initialExamTypeId);
  const [category, setCategory] = useState(initialData?.category || "");
  const [tag, setTag] = useState(initialData?.tag || "");
  const [text, setText] = useState(initialData?.text || "");
  const [explanation, setExplanation] = useState(initialData?.explanation || "");

  // Options drafts
  const [options, setOptions] = useState<AnswerOptionDraft[]>(() => {
    return LETTERS.map((letter) => {
      const existing = initialData?.answerOptions?.find((o) => o.letter === letter);
      return {
        letter,
        text: existing?.text || "",
      };
    });
  });

  // Selected correct letter
  const [correctLetter, setCorrectLetter] = useState<string>(() => {
    const correctOpt = initialData?.answerOptions?.find((o) => o.isCorrect);
    return correctOpt ? correctOpt.letter : "";
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOptionTextChange(letter: string, newText: string) {
    setOptions((prev) =>
      prev.map((opt) => (opt.letter === letter ? { ...opt, text: newText } : opt))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!examTypeId) {
      setError("Por favor, selecciona un tipo de examen.");
      return;
    }

    if (!correctLetter) {
      setError("Por favor, marca cuál es la respuesta correcta.");
      return;
    }

    const payload = {
      text,
      category: category.trim() || null,
      tag: tag.trim() || null,
      explanation: explanation.trim() || null,
      examTypeId: parseInt(examTypeId, 10),
      answerOptions: options.map((opt) => ({
        letter: opt.letter,
        text: opt.text,
        isCorrect: opt.letter === correctLetter,
      })),
    };

    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const url = isEditing
        ? `/api/questions/${initialData!.id}`
        : `/api/questions`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Error al ${isEditing ? "actualizar" : "crear"} la pregunta`);
      }

      router.push("/questions");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al guardar la pregunta"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 p-6 space-y-6">
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        {isEditing ? "Editar Pregunta" : "Nueva Pregunta"}
      </h1>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Tipo de examen */}
      <div>
        <label htmlFor="examTypeId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Tipo de examen
        </label>
        <select
          id="examTypeId"
          value={examTypeId}
          onChange={(e) => setExamTypeId(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        >
          <option value="">Selecciona un tipo de examen</option>
          {examTypes.map((et) => (
            <option key={et.id} value={et.id}>
              {et.code} - {et.name}
            </option>
          ))}
        </select>
      </div>

      {/* Categoría */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Categoría
        </label>
        <input
          type="text"
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Opcional"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Tag */}
      <div>
        <label htmlFor="tag" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Tag
        </label>
        <input
          type="text"
          id="tag"
          list="tagOptions"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          maxLength={100}
          placeholder="Opcional"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        <datalist id="tagOptions">
          {tags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Etiqueta opcional para agrupar preguntas (por ejemplo, por tema).
        </p>
      </div>

      {/* Texto de la pregunta */}
      <div>
        <label htmlFor="text" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Texto de la pregunta
        </label>
        <textarea
          id="text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          placeholder="Pregunta..."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Explicación */}
      <div>
        <label htmlFor="explanation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Explicación
        </label>
        <textarea
          id="explanation"
          rows={3}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          placeholder="Opcional: explica por qué la respuesta correcta es correcta"
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
      </div>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Opciones de respuesta */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Opciones de respuesta
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Solo una opción debe ser la correcta.
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt) => (
            <div key={opt.letter} className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-200">
                {opt.letter}
              </span>
              <input
                type="text"
                value={opt.text}
                onChange={(e) => handleOptionTextChange(opt.letter, e.target.value)}
                placeholder="Texto de la opción"
                required
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="correctLetter"
                  value={opt.letter}
                  checked={correctLetter === opt.letter}
                  onChange={() => setCorrectLetter(opt.letter)}
                  required
                  className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-700 focus:ring-blue-500"
                />
                Correcta
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs focus:outline-none disabled:opacity-50 transition-colors"
        >
          {isEditing ? "Guardar cambios" : "Crear pregunta"}
        </button>
        <Link
          href="/questions"
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
