import Link from "next/link";
import { auth } from "@/auth";

export const instant = false;

interface ExamTypeInfo {
  code: string;
  name: string;
  description: string;
}

const EXAM_TYPES: ExamTypeInfo[] = [
  { code: "MIR", name: "Médico Interno Residente", description: "Medicina" },
  { code: "EIR", name: "Enfermero Interno Residente", description: "Enfermería" },
  { code: "BIR", name: "Biólogo Interno Residente", description: "Biología y Bioquímica" },
  { code: "FIR", name: "Farmacéutico Interno Residente", description: "Farmacia" },
  { code: "PIR", name: "Psicólogo Interno Residente", description: "Psicología" },
  { code: "QIR", name: "Químico Interno Residente", description: "Química" },
  { code: "RFIR", name: "Radiofísico Interno Residente", description: "Radiofísica Hospitalaria" },
];

export default async function LandingPage() {
  const session = await auth();
  const isAuthenticated = Boolean(session?.user);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-600">
            BirApp
          </Link>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600">
                  {session?.user?.name}
                </span>
                <Link
                  href="/estadisticas"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Mis estadísticas
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

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

        {/* Question Banks Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Banco de preguntas</h2>
            <span className="text-sm text-gray-500">
              7 especialidades oficiales
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXAM_TYPES.map((et) => (
              <div
                key={et.code}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                      {et.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {et.name}
                  </h3>
                  <p className="text-sm text-gray-500">{et.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
