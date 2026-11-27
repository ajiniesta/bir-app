import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import { QuestionPageResponse, ExamType } from "@/app/questions/types";
import DoubtQuestionsClient from "./DoubtQuestionsClient";

export const instant = false;

interface DoubtQuestionsPageProps {
  searchParams?: Promise<{
    q?: string;
    examType?: string;
    category?: string;
    tag?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function DoubtQuestionsPage(props: DoubtQuestionsPageProps) {
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

  const resolvedParams = props.searchParams ? await props.searchParams : {};
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const q = resolvedParams.q || "";
  const examType = resolvedParams.examType || "";
  const category = resolvedParams.category || "";
  const tag = resolvedParams.tag || "";
  const status = resolvedParams.status || "";

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  const queryParams = new URLSearchParams({
    page: page.toString(),
    size: "20",
  });
  if (q) queryParams.set("q", q);
  if (examType) queryParams.set("examType", examType);
  if (category) queryParams.set("category", category);
  if (tag) queryParams.set("tag", tag);
  if (status) queryParams.set("status", status);

  let pageData: QuestionPageResponse = {
    items: [],
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  };
  let examTypes: ExamType[] = [];
  let categories: string[] = [];
  let tags: string[] = [];
  let unauthorized = false;

  try {
    const res = await fetch(
      `${apiBaseUrl}/api/question-status/doubts?${queryParams.toString()}`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );
    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      pageData = await res.json();
      if (!pageData.items) pageData.items = [];
    }
  } catch {}

  if (unauthorized) {
    redirect("/logout");
    return null;
  }

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
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <DoubtQuestionsClient
          key={`${q}-${examType}-${category}-${tag}-${status}-${page}`}
          initialData={pageData}
          examTypes={examTypes}
          categories={categories}
          tags={tags}
          currentQuery={{ q, examType, category, tag, status, page }}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
