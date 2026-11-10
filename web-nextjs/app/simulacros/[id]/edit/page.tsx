import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamForm from "../../MockExamForm";
import { ExamType, QuestionSummary, MockExamResponse } from "../../types";

export const instant = false;

interface EditSimulacroPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditSimulacroPage(props: EditSimulacroPageProps) {
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        <Navbar session={session} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-6 text-center text-sm text-red-800 dark:text-red-300 space-y-3">
            <h1 className="text-lg font-bold">Acceso denegado</h1>
            <p>Solo los creadores y administradores pueden editar simulacros.</p>
            <div>
              <Link
                href="/simulacros"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a simulacros
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

  let mockExam: MockExamResponse | null = null;
  let examTypes: ExamType[] = [];
  let allQuestions: QuestionSummary[] = [];

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

  if (!mockExam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        <Navbar session={session} />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300">
            Simulacro no encontrado.
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Editar simulacro</h1>
        <MockExamForm
          initialExam={mockExam}
          examTypes={examTypes}
          allQuestions={allQuestions}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
