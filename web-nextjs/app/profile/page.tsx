import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";
import ChangePasswordButton from "./ChangePasswordButton";

export const instant = false;

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const user = session.user as {
    name?: string;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };
  const role = user.role || "USER";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <Navbar session={session} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100 font-medium">
            Mi Perfil
          </span>
        </nav>

        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Perfil de usuario
                </h1>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold self-center sm:self-auto ${
                    role === "ADMIN"
                      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                      : role === "CREATOR"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  }`}
                >
                  Rol: {role}
                </span>
              </div>
              <p className="mt-2 text-lg text-slate-600 dark:text-slate-300 font-medium">
                {user.name}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Sesión activa en BirApp
              </p>
            </div>
          </div>
        </div>

        {/* Account Information Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Datos de la cuenta
            </h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Usuario:</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-200">
                  {user.name}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Rol del sistema:</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-200">
                  {role}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <dt className="text-slate-500 dark:text-slate-400">Estado:</dt>
                <dd className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Conectado
                </dd>
              </div>
              <div className="flex justify-between items-center py-2">
                <dt className="text-slate-500 dark:text-slate-400">Contraseña:</dt>
                <dd>
                  <ChangePasswordButton accessToken={user.accessToken} />
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Preferencias y Ajustes
            </h2>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-4 border border-dashed border-slate-300 dark:border-slate-700 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                Opciones de configuración del perfil
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
                Próximamente podrás personalizar tus preferencias de estudio, temas favoritos, notificaciones y opciones de cuenta desde esta sección.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800/80 rounded-xl p-6 border border-blue-100 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Acceso Rápido
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/free"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors shadow-xs"
            >
              Practicar modo libre
            </Link>
            <Link
              href="/simulacros"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Simulacros de examen
            </Link>
            <Link
              href="/estadisticas"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Ver mis estadísticas
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
