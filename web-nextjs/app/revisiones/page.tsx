import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import ReviewListClient from "./ReviewListClient";
import { AnswerProposal, ExamType } from "./types";

export const instant = false;

interface ReviewPageProps {
  searchParams?: Promise<{
    status?: string;
    examType?: string;
  }>;
}

export default async function ReviewPage(props: ReviewPageProps) {
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <Navbar session={session} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div
            role="alert"
            className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-red-200 dark:border-red-900/60 p-8 text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-red-700 dark:text-red-400">Acceso denegado</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Solo los usuarios con rol <strong>ADMIN</strong> o <strong>CREATOR</strong> pueden acceder a la bandeja de revisiones.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const resolvedParams = props.searchParams ? await props.searchParams : {};
  const status = resolvedParams.status !== undefined ? resolvedParams.status : "PENDING";
  const examType = resolvedParams.examType || "";

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  const queryParams = new URLSearchParams();
  if (status) queryParams.set("status", status);
  if (examType) queryParams.set("examType", examType);

  let proposals: AnswerProposal[] = [];
  let examTypes: ExamType[] = [];

  try {
    const res = await fetch(`${apiBaseUrl}/api/proposals?${queryParams.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      proposals = await res.json();
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      <Navbar session={session} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Modo revisión de respuestas
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Propuestas de respuesta alternativa enviadas por los usuarios. Al <strong>aceptar</strong> una propuesta, la opción propuesta pasa a ser la correcta en la pregunta; al <strong>rechazarla</strong> no se toca. Ambas acciones admiten una nota.
          </p>
        </div>

        <ReviewListClient
          key={`${status}-${examType}`}
          initialProposals={proposals}
          examTypes={examTypes}
          currentStatus={status}
          currentExamType={examType}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
