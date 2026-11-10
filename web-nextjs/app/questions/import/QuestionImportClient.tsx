"use client";

import { useState } from "react";
import Link from "next/link";
import { splitJsonObjects } from "./jsonSplitter";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const BATCH_SIZE = 50;

interface QuestionImportClientProps {
  accessToken?: string;
}

interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: string[];
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error || new Error("Error al leer el fichero"));
    reader.readAsText(file);
  });
}

export default function QuestionImportClient({ accessToken }: QuestionImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Counters
  const [importedCount, setImportedCount] = useState(0);
  const [duplicatesCount, setDuplicatesCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [errorList, setErrorList] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMessage(null);
    setIsDone(false);
    setProgress(0);
    setErrorList([]);
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected && selected.size > MAX_FILE_SIZE) {
      setErrorMessage("El fichero no puede superar los 10 MB.");
    }
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Selecciona un fichero con preguntas.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("El fichero no puede superar los 10 MB.");
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgress(0);
    setStatusText("Leyendo el fichero…");
    setImportedCount(0);
    setDuplicatesCount(0);
    setSkippedCount(0);
    setErrorList([]);
    setIsDone(false);

    try {
      const rawText = await readFileAsText(file);
      const chunks = splitJsonObjects(rawText);

      if (chunks.length === 0) {
        throw new Error("No se ha encontrado ninguna pregunta en el fichero (¿JSON mal formado?).");
      }

      // Group into batches
      const batches: string[][] = [];
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        batches.push(chunks.slice(i, i + BATCH_SIZE));
      }

      const totalBatches = batches.length;
      let totalImported = 0;
      let totalDuplicates = 0;
      let totalSkipped = 0;
      const accumulatedErrors: string[] = [];

      for (let index = 0; index < totalBatches; index++) {
        setStatusText(`Procesando lote ${index + 1} de ${totalBatches}…`);

        const batchChunks = batches[index];
        const batchContent = `[${batchChunks.join(",")}]`;
        const offset = index * BATCH_SIZE;

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch("/api/questions/import", {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: batchContent,
            startPosition: offset,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Error al procesar el lote ${index + 1} (HTTP ${res.status})`);
        }

        const result: ImportResult = await res.json();
        totalImported += result.imported || 0;
        totalDuplicates += result.duplicates || 0;
        totalSkipped += result.skipped || 0;
        if (result.errors?.length) {
          accumulatedErrors.push(...result.errors);
        }

        setImportedCount(totalImported);
        setDuplicatesCount(totalDuplicates);
        setSkippedCount(totalSkipped);
        setErrorList([...accumulatedErrors]);

        const currentPercent = Math.round(((index + 1) / totalBatches) * 100);
        setProgress(currentPercent);

        // Yield to browser event loop
        await new Promise((r) => setTimeout(r, 10));
      }

      setStatusText(`Importación terminada: ${totalBatches} lote(s) procesados.`);
      setIsDone(true);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error inesperado durante la importación.");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Importar preguntas</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Carga masiva de preguntas desde fichero JSON hacia el banco del sistema.
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

      {/* Progress & Live Results Panel */}
      {(isProcessing || isDone) && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isDone ? "Importación terminada" : "Progreso de importación"}
            </h2>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">{progress}%</span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                isDone ? "bg-green-600" : "bg-blue-600 animate-pulse"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">{statusText}</p>

          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">Importadas</span>
              <strong className="text-sm text-green-600 dark:text-green-400 font-bold">{importedCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">Ya existentes</span>
              <strong className="text-sm text-slate-700 dark:text-slate-300 font-bold">{duplicatesCount}</strong>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">Con errores</span>
              <strong className="text-sm text-red-600 dark:text-red-400 font-bold">{skippedCount}</strong>
            </div>
          </div>

          {/* Final Results summary text */}
          {isDone && (
            <div className="rounded-xl bg-green-50 dark:bg-green-950/30 p-4 border border-green-200 dark:border-green-900/50 text-xs text-green-900 dark:text-green-300 space-y-1">
              <p className="font-bold">
                Importación terminada: {importedCount} {importedCount === 1 ? "importada" : "importadas"}, {duplicatesCount} {duplicatesCount === 1 ? "ya existente" : "ya existentes"}, {skippedCount} {skippedCount === 1 ? "con errores" : "con errores"}.
              </p>
            </div>
          )}

          {/* Error messages list if any */}
          {errorList.length > 0 && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <p className="font-bold">Preguntas descartadas (el resto se ha importado):</p>
              <ul className="list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                {errorList.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleImportSubmit} noValidate className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4">
        <div>
          <label htmlFor="file" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Fichero de preguntas
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".json,.txt,application/json,text/plain"
            onChange={handleFileChange}
            disabled={isProcessing}
            required
            className="w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-950/60 dark:file:text-blue-400 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 cursor-pointer"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Selecciona un fichero JSON con las preguntas que quieres importar (hasta 10 MB). Las preguntas ya guardadas se omiten para evitar duplicados.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isProcessing || !file}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition disabled:opacity-50"
          >
            {isProcessing ? "Importando…" : "Importar"}
          </button>
          <Link
            href="/questions"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancelar
          </Link>
        </div>
      </form>

      {/* Sample Format Display */}
      <details className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-6" open>
        <summary className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400">
          Formato del fichero
        </summary>
        <div className="mt-3 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p>
            El fichero puede contener un array de preguntas o varios objetos JSON consecutivos. Cada pregunta requiere obligatoriamente <code>text</code>, <code>exam_type</code> y <code>answers</code> con exactamente una respuesta correcta (<code>is_correct: true</code>).
          </p>
          <pre className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono text-[11px] overflow-x-auto">
{`{
  "exam_type": "3",
  "category": "Fisiología",
  "tag": "Tema 1",
  "text": "Esta es la pregunta",
  "explanation": "Esta es la explicación",
  "answers": [
    {"letter": "A", "text": "respuesta 1", "is_correct": true},
    {"letter": "B", "text": "respuesta 2", "is_correct": false},
    {"letter": "C", "text": "respuesta 3", "is_correct": false},
    {"letter": "D", "text": "respuesta 4", "is_correct": false}
  ]
}`}
          </pre>
        </div>
      </details>
    </div>
  );
}
