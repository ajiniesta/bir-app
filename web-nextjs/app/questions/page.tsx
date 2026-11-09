import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import QuestionsListClient from "./QuestionsListClient";
import { QuestionPageResponse, ExamType } from "./types";

export const instant = false;

interface QuestionsPageProps {
  searchParams?: Promise<{
    q?: string;
    examType?: string;
    category?: string;
    tag?: string;
    page?: string;
  }>;
}

export default async function QuestionsPage(props: QuestionsPageProps) {
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
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div
            role="alert"
            className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center space-y-4"
          >
            <h1 className="text-2xl font-bold text-red-700">Acceso denegado</h1>
            <p className="text-sm text-gray-600">
              Solo los usuarios con rol <strong>ADMIN</strong> o <strong>CREATOR</strong> pueden gestionar las preguntas.
            </p>
            <div>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;
  const q = resolvedParams.q || "";
  const examType = resolvedParams.examType || "";
  const category = resolvedParams.category || "";
  const tag = resolvedParams.tag || "";

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

  try {
    const res = await fetch(`${apiBaseUrl}/api/questions/page?${queryParams.toString()}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      pageData = await res.json();
      if (!pageData.items) pageData.items = [];
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
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar session={session} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Preguntas</h1>
          <div className="flex gap-2">
            <Link
              href="/questions/create"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Nueva Pregunta
            </Link>
          </div>
        </div>

        <QuestionsListClient
          key={`${q}-${examType}-${category}-${tag}-${page}`}
          initialData={pageData}
          examTypes={examTypes}
          categories={categories}
          tags={tags}
          currentQuery={{ q, examType, category, tag, page }}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
