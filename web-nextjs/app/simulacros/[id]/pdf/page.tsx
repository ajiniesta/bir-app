import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PrintButton from "./PrintButton";
import { MockExamResponse } from "../../types";

export const instant = false;

interface SimulacroPdfPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SimulacroPdfPage(props: SimulacroPdfPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const user = session.user as {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };

  const { id } = await props.params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let mockExam: MockExamResponse | null = null;
  try {
    const res = await fetch(`${apiBaseUrl}/api/mock-exams/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      mockExam = await res.json();
    }
  } catch {}

  if (!mockExam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Simulacro no encontrado.
      </div>
    );
  }

  const todayStr = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="bg-white dark:bg-slate-900 min-h-screen text-slate-900 dark:text-slate-100 p-6 sm:p-12 max-w-4xl mx-auto print:bg-white print:text-black print:p-0 print:max-w-none transition-colors">
      {/* Top action for screen */}
      <div className="print:hidden mb-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <a
          href={`/simulacros/${mockExam.id}`}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Volver al simulacro
        </a>
        <PrintButton />
      </div>

      {/* Header */}
      <header className="border-b-2 border-slate-900 dark:border-slate-200 print:border-black pb-4 mb-6">
        <div className="text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 print:text-gray-600 font-bold">
          BirApp
        </div>
        <h1 className="text-2xl font-bold mt-1 mb-2 text-slate-900 dark:text-white print:text-black">{mockExam.title}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700 dark:text-slate-300 print:text-gray-800">
          <span>
            Banco: <strong>{mockExam.examTypeName} ({mockExam.examTypeCode})</strong>
          </span>
          <span>
            Preguntas: <strong>{mockExam.questionCount}</strong>
          </span>
          <span>
            Fecha: <strong>{todayStr}</strong>
          </span>
        </div>
        {mockExam.description && (
          <p className="text-xs text-slate-600 dark:text-slate-300 print:text-gray-700 mt-2">{mockExam.description}</p>
        )}
        <p className="text-xs italic text-slate-500 dark:text-slate-400 print:text-gray-600 mt-2">
          Marca con una X la opción correcta de cada pregunta. Puedes usar la hoja de respuestas final.
        </p>
      </header>

      {/* Questions list */}
      <div className="space-y-6">
        {mockExam.questions?.map((q) => (
          <div key={q.position} className="break-inside-avoid">
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100 print:text-black">
              <span className="mr-1">{q.position}.</span>
              <span>{q.text}</span>
            </div>

            {(q.category || q.tag) && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-gray-600 mt-0.5">
                {q.category}
                {q.category && q.tag && " · "}
                {q.tag && `Tag: #${q.tag}`}
              </div>
            )}

            <div className="mt-1.5 ml-4 space-y-0.5 text-xs text-slate-800 dark:text-slate-200 print:text-black">
              {q.options?.map((o) => (
                <div key={o.letter} className="flex items-start gap-1">
                  <span className="font-bold">{o.letter})</span>
                  <span>{o.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Answer Sheet */}
      <section className="mt-12 pt-8 border-t-2 border-dashed border-slate-300 dark:border-slate-700 print:border-gray-400 break-before-page">
        <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-white print:text-black">Hoja de respuestas</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 print:text-gray-600 mb-4">
          {mockExam.title} — {mockExam.examTypeCode}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {mockExam.questions?.map((q) => (
            <div
              key={q.position}
              className="border border-slate-300 dark:border-slate-700 print:border-gray-400 p-2 rounded-lg flex items-center justify-between text-xs"
            >
              <span className="font-bold text-slate-700 dark:text-slate-300 print:text-gray-700 w-6">{q.position}</span>
              <div className="flex gap-1">
                {q.options?.map((o) => (
                  <span
                    key={o.letter}
                    className="w-5 h-5 border border-slate-400 dark:border-slate-600 print:border-black inline-flex items-center justify-center font-bold text-[10px]"
                  >
                    {o.letter}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
