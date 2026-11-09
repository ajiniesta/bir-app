import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { QuestionDetailResponse } from "../types";

export const instant = false;

function formatDate(dateString?: string | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

interface QuestionDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuestionDetailPage(props: QuestionDetailPageProps) {
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
  const isAdmin =
    user.role === "ADMIN" || Boolean(user.roles?.includes("ROLE_ADMIN"));
  const isCreator =
    user.role === "CREATOR" || Boolean(user.roles?.includes("ROLE_CREATOR"));

  if (!isAdmin && !isCreator) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <Navbar session={session} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div
            role="alert"
            className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-red-700">Acceso denegado</h1>
            <p className="text-sm text-gray-600">
              Solo los usuarios con rol <strong>ADMIN</strong> o <strong>CREATOR</strong> pueden gestionar las preguntas.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const { id } = await props.params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let question: QuestionDetailResponse | null = null;
  let notFound = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/questions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      question = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !question ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 space-y-3">
            <p>Pregunta no encontrada.</p>
            <div>
              <Link
                href="/questions"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver al listado
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Pregunta #{question.id}
              </h1>
              <div className="flex gap-2">
                <Link
                  href={`/questions/${question.id}/edit`}
                  className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Editar
                </Link>
                <Link
                  href="/questions"
                  className="rounded-md bg-blue-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Volver
                </Link>
              </div>
            </div>

            {/* Statement card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-800">
                  {question.examTypeCode || "N/A"}
                </span>
                {question.category && (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200">
                    {question.category}
                  </span>
                )}
                {question.tag && (
                  <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    #{question.tag}
                  </span>
                )}
              </div>
              <p className="text-lg text-gray-900 leading-relaxed font-normal whitespace-pre-wrap">
                {question.text}
              </p>
            </div>

            {/* Explanation card */}
            {question.explanation && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-2">Explicación</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Options list */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-900">
                Opciones de respuesta
              </h2>
              <div className="space-y-2">
                {question.answerOptions.map((opt) => (
                  <div
                    key={opt.letter}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border text-sm transition-colors ${
                      opt.isCorrect
                        ? "bg-green-50 border-green-300 text-green-950 font-medium"
                        : "bg-white border-gray-200 text-gray-800"
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        opt.isCorrect
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {opt.letter}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap">{opt.text}</span>
                    {opt.isCorrect && (
                      <span className="inline-flex items-center rounded-md bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                        Correcta
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Timestamps */}
            {(question.createdAt || question.updatedAt) && (
              <div className="pt-2 text-xs text-gray-500 flex flex-wrap gap-4 border-t border-gray-200">
                {question.createdAt && (
                  <span>Creado: {formatDate(question.createdAt)}</span>
                )}
                {question.updatedAt && (
                  <span>Modificado: {formatDate(question.updatedAt)}</span>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
