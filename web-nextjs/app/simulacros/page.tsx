import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamListClient from "./MockExamListClient";
import { MockExamSummary } from "./types";

export const instant = false;

export default async function SimulacrosPage() {
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

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let mockExams: MockExamSummary[] = [];
  try {
    const res = await fetch(`${apiBaseUrl}/api/mock-exams`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      mockExams = await res.json();
    }
  } catch {}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <MockExamListClient
          initialMockExams={mockExams}
          canManage={canManage}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
