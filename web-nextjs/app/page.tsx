import Link from "next/link";
import { auth } from "@/auth";
import Navbar from "./components/Navbar";

export const instant = false;

interface ExamTypeStats {
  code: string;
  name: string;
  total?: number;
}

interface DashboardStatsResponse {
  totalQuestions: number;
  byExamType: ExamTypeStats[];
}

const EXAM_DESCRIPTIONS: Record<string, string> = {
  MIR: "Medicina",
  EIR: "Enfermería",
  BIR: "Biología y Bioquímica",
  FIR: "Farmacia",
  PIR: "Psicología",
  QIR: "Química",
  RFIR: "Radiofísica Hospitalaria",
};

async function fetchPermittedBanks(accessToken?: string): Promise<DashboardStatsResponse> {
  if (!accessToken) {
    return { totalQuestions: 0, byExamType: [] };
  }

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  try {
    const res = await fetch(`${apiBaseUrl}/api/stats/banks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { totalQuestions: 0, byExamType: [] };
    }

    const data = await res.json();
    if (Array.isArray(data)) {
      return {
        totalQuestions: 0,
        byExamType: data,
      };
    }

    return {
      totalQuestions: typeof data?.totalQuestions === "number" ? data.totalQuestions : 0,
      byExamType: Array.isArray(data?.byExamType) ? data.byExamType : [],
    };
  } catch {
    return { totalQuestions: 0, byExamType: [] };
  }
}

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);
  const accessToken = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const bankStats = isAuthenticated
    ? await fetchPermittedBanks(accessToken)
    : null;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Hero Section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-3">
            BirApp
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mb-6">
            Banco de preguntas tipo test para las oposiciones MIR, EIR, BIR, FIR, PIR, QIR y RFIR.
          </p>

          <div className="flex flex-wrap gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/free"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Empezar modo libre
                </Link>
                <Link
                  href="/simulacros"
                  className="inline-flex items-center justify-center rounded-md bg-blue-50 px-5 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  Ver simulacros
                </Link>
                <Link
                  href="/estadisticas"
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Mis estadísticas
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Crear una cuenta
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-md border border-blue-600 bg-white px-5 py-2.5 text-sm font-medium text-blue-600 hover:bg-blue-50"
                >
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        </section>

        {/* Question Banks Section (only visible for authenticated users) */}
        {isAuthenticated && bankStats && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Banco de preguntas</h2>
              <span className="text-sm text-gray-500">
                {bankStats.totalQuestions} preguntas · {bankStats.byExamType.length} tipos de examen
              </span>
            </div>

            {bankStats.byExamType.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {bankStats.byExamType.map((et) => (
                  <div
                    key={et.code}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                          {et.code}
                        </span>
                        {typeof et.total === "number" && (
                          <span className="text-2xl font-semibold text-gray-900">
                            {et.total}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {et.name}
                      </h3>
                      {EXAM_DESCRIPTIONS[et.code] && (
                        <p className="text-sm text-gray-500">
                          {EXAM_DESCRIPTIONS[et.code]}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                role="status"
                className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800"
              >
                No tienes bancos de preguntas asignados. Pide a un administrador que te asigne uno.
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
