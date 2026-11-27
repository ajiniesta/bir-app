import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import RepasoConfigClient from "./RepasoConfigClient";
import { ExamType, ReviewFiltersResponse, ReviewSessionSummary } from "./types";

export const instant = false;

interface RepasoConfigPageProps {
  searchParams?: Promise<{
    examType?: string;
    onlyDoubt?: string;
    onlyFailed?: string;
  }>;
}

export default async function RepasoConfigPage(props?: RepasoConfigPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
    return null;
  }

  const resolvedParams = props?.searchParams ? await props.searchParams : {};
  const initialExamType = resolvedParams.examType || "";
  const initialOnlyDoubt =
    resolvedParams.onlyDoubt === "true" || resolvedParams.onlyDoubt === "1";
  const initialOnlyFailed =
    resolvedParams.onlyFailed === "true" || resolvedParams.onlyFailed === "1";

  const user = session.user as {
    name?: string | null;
    role?: string;
    roles?: string[];
    accessToken?: string;
  };

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let examTypes: ExamType[] = [];
  let activeSessions: ReviewSessionSummary[] = [];
  let initialCategories: string[] = [];
  let initialTags: string[] = [];
  let unauthorized = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/exam-types`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      examTypes = await res.json();
    }
  } catch {}

  if (unauthorized) {
    redirect("/logout");
    return null;
  }

  try {
    const res = await fetch(`${apiBaseUrl}/api/review-sessions`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        activeSessions = data;
      }
    }
  } catch {}

  try {
    const res = await fetch(`${apiBaseUrl}/api/review-sessions/filters`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      const data: ReviewFiltersResponse = await res.json();
      initialCategories = Array.isArray(data?.categories) ? data.categories : [];
      initialTags = Array.isArray(data?.tags) ? data.tags : [];
    }
  } catch {}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
          Modo repaso
        </h1>
        <RepasoConfigClient
          examTypes={examTypes}
          activeSessions={activeSessions}
          initialCategories={initialCategories}
          initialTags={initialTags}
          initialExamType={initialExamType}
          initialOnlyDoubt={initialOnlyDoubt}
          initialOnlyFailed={initialOnlyFailed}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
