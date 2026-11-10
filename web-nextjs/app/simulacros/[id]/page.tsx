import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamDetailClient from "./MockExamDetailClient";
import { MockExamResponse, MockExamAttemptSummary } from "../types";

export const instant = false;

interface SimulacroDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SimulacroDetailPage(props: SimulacroDetailPageProps) {
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
  const canManage = isAdmin || isCreator;

  const { id } = await props.params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let mockExam: MockExamResponse | null = null;
  let attempts: MockExamAttemptSummary[] = [];

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
    const res = await fetch(`${apiBaseUrl}/api/mock-exams/${id}/attempts`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      attempts = await res.json();
    }
  } catch {}

  if (!mockExam) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
        <Navbar session={session} />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
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
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <MockExamDetailClient
          mockExam={mockExam}
          attempts={attempts}
          canManage={canManage}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
