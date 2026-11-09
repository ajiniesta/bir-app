"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExamType } from "./types";

interface FreeConfigFormProps {
  examTypes: ExamType[];
  categories: string[];
  tags: string[];
  accessToken?: string;
}

export default function FreeConfigForm({
  examTypes,
  categories,
  tags,
  accessToken,
}: FreeConfigFormProps) {
  const router = useRouter();
  const [examTypeCode, setExamTypeCode] = useState("");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [count, setCount] = useState<number | string>(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCount = typeof count === "string" ? parseInt(count, 10) : count;
    if (isNaN(parsedCount) || parsedCount < 1 || parsedCount > 100) {
      setError("El número de preguntas debe estar entre 1 y 100.");
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

      const res = await fetch("/api/free-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          examTypeCode: examTypeCode || null,
          category: category || null,
          tag: tag || null,
          count: parsedCount,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Error al iniciar la partida");
      }

      const data = await res.json();
      router.push(`/free/${data.id}`);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error inesperado al iniciar la partida"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-md bg-red-50 p-4 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {examTypes.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          No tienes ningún banco de preguntas disponible. Si eres usuario normal, pide a un administrador que te asigne uno.
        </div>
      )}

      <p className="text-sm text-gray-600">
        Configura tu serie de preguntas. Se elegirán al azar y recibirás feedback al responder cada una.
      </p>

      <form noValidate onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
        {/* Tipo de examen */}
        <div>
          <label htmlFor="examTypeCode" className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de examen
          </label>
          <select
            id="examTypeCode"
            name="examTypeCode"
            value={examTypeCode}
            onChange={(e) => setExamTypeCode(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            {examTypes.map((et) => (
              <option key={et.id} value={et.code}>
                {et.code} - {et.name}
              </option>
            ))}
          </select>
        </div>

        {/* Categoría */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Todavía no hay categorías registradas.
            </p>
          )}
        </div>

        {/* Tag */}
        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-gray-700 mb-1">
            Tag
          </label>
          <select
            id="tag"
            name="tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos los tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {tags.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Todavía no hay tags registrados.
            </p>
          )}
        </div>

        {/* Número de preguntas */}
        <div>
          <label htmlFor="count" className="block text-sm font-medium text-gray-700 mb-1">
            Número de preguntas
          </label>
          <input
            type="number"
            id="count"
            name="count"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            min={1}
            max={100}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Entre 1 y 100. Si hay menos disponibles, se usarán todas.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none disabled:opacity-50"
        >
          {loading ? "Iniciando..." : "Empezar partida"}
        </button>
      </form>
    </div>
  );
}
