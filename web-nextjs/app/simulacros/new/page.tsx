import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamForm from "../MockExamForm";
import { ExamType, QuestionSummary } from "../types";

export const instant = false;

export default async function CreateSimulacroPage() {
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
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-800 space-y-3">
            <h1 className="text-lg font-bold">Acceso denegado</h1>
            <p>Solo los creadores y administradores pueden crear simulacros.</p>
            <div>
              <Link
                href="/simulacros"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver a simulacros
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let examTypes: ExamType[] = [];
  let allQuestions: QuestionSummary[] = [];

  try {
    const res = await fetch(`${apiBaseUrl}/api/exam-types`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      examTypes = await res.json();
    }
  } catch {}

  try {
    const res = await fetch(`${apiBaseUrl}/api/questions`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      allQuestions = await res.json();
    }
  } catch {}

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo simulacro</h1>
        <MockExamForm
          examTypes={examTypes}
          allQuestions={allQuestions}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
