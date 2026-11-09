import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { FreeSessionResponse } from "../../types";

export const instant = false;

interface FreeResultPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FreeResultPage(props: FreeResultPageProps) {
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

  let freeSession: FreeSessionResponse | null = null;
  let notFound = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/free-sessions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      freeSession = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  const percent =
    freeSession && freeSession.totalQuestions > 0
      ? Math.round((freeSession.correctCount * 100) / freeSession.totalQuestions)
      : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notFound || !freeSession ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800 space-y-3">
            <p>Partida no encontrada.</p>
            <div>
              <Link
                href="/free"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver a configuración
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Resultado de la partida
            </h1>

            {/* Score cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-gray-500 mb-1">
                  Preguntas
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {freeSession.totalQuestions}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-gray-500 mb-1">
                  Acertadas
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {freeSession.correctCount}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
                <div className="text-xs uppercase font-semibold text-gray-500 mb-1">
                  Acierto
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {percent}%
                </div>
              </div>
            </div>

            {/* Metadata summary */}
            {(freeSession.examTypeName || freeSession.category || freeSession.tag) && (
              <div className="flex flex-wrap gap-3 text-xs text-gray-600 bg-white rounded-lg border border-gray-200 p-3">
                {freeSession.examTypeName && (
                  <span>
                    Tipo: <strong className="text-gray-900">{freeSession.examTypeName}</strong>
                  </span>
                )}
                {freeSession.category && (
                  <span>
                    Categoría: <strong className="text-gray-900">{freeSession.category}</strong>
                  </span>
                )}
                {freeSession.tag && (
                  <span>
                    Tag: <strong className="text-gray-900">#{freeSession.tag}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Questions list */}
            <div className="space-y-3">
              {(freeSession.items || []).map((item) => (
                <div
                  key={item.position}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-2"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="text-sm font-medium text-gray-900">
                      <span>#{item.position}. {item.questionText}</span>
                      {item.tag && (
                        <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 ml-2">
                          #{item.tag}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold shrink-0 ${
                        item.correct
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.correct ? "Correcta" : "Incorrecta"}
                    </span>
                  </div>

                  {item.answered && (
                    <div className="text-xs text-gray-500">
                      Tu respuesta: <strong className="text-gray-800">{item.selectedLetter}</strong> · Correcta: <strong className="text-gray-800">{item.correctLetter}</strong>
                    </div>
                  )}

                  {item.explanation && (
                    <div className="pt-2 text-xs border-t border-gray-100 text-gray-600">
                      <span className="font-semibold text-gray-700">Explicación:</span>{" "}
                      <span className="whitespace-pre-wrap">{item.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/free"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Nueva partida
              </Link>
              <Link
                href="/"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver al panel
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
