import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import FreeConfigForm from "./FreeConfigForm";
import { ExamType } from "./types";

export const instant = false;

export default async function FreeConfigPage() {
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

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let examTypes: ExamType[] = [];
  let categories: string[] = [];
  let tags: string[] = [];

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
    const res = await fetch(`${apiBaseUrl}/api/questions/categories`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      categories = await res.json();
    }
  } catch {}

  try {
    const res = await fetch(`${apiBaseUrl}/api/tags`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      tags = await res.json();
    }
  } catch {}

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Modo libre</h1>
        <FreeConfigForm
          examTypes={examTypes}
          categories={categories}
          tags={tags}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
