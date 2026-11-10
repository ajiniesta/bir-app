import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import QuestionDuplicatesClient from "./QuestionDuplicatesClient";
import { ExamType, DuplicateQuestionsResponse } from "./types";

export const instant = false;

interface QuestionDuplicatesPageProps {
  searchParams?: Promise<{
    examType?: string;
  }>;
}

export default async function QuestionDuplicatesPage(props: QuestionDuplicatesPageProps) {
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
            <p>Solo los creadores y administradores pueden gestionar preguntas duplicadas.</p>
            <div>
              <Link
                href="/questions"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Volver a preguntas
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const searchParams = props.searchParams ? await props.searchParams : {};
  const selectedExamType = searchParams?.examType || "";

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let examTypes: ExamType[] = [];
  let preview: DuplicateQuestionsResponse | null = null;

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

  if (selectedExamType) {
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/questions/duplicates?examType=${encodeURIComponent(selectedExamType)}`,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );
      if (res.ok) {
        preview = await res.json();
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar session={session} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuestionDuplicatesClient
          examTypes={examTypes}
          selectedExamType={selectedExamType}
          initialPreview={preview}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
