import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import QuestionForm from "../QuestionForm";
import { ExamType } from "../types";

export const instant = false;

export default async function CreateQuestionPage() {
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

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let examTypes: ExamType[] = [];
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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <QuestionForm
          examTypes={examTypes}
          tags={tags}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
