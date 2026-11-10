import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamAttemptClient from "./MockExamAttemptClient";
import { MockExamAttemptResponse } from "../../../types";

export const instant = false;

interface SimulacroAttemptPageProps {
  params: Promise<{
    id: string;
    attemptId: string;
  }>;
  searchParams?: Promise<{
    position?: string;
  }>;
}

export default async function SimulacroAttemptPage(props: SimulacroAttemptPageProps) {
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

  const { id, attemptId } = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : {};
  const requestedPosition = searchParams?.position ? Number(searchParams.position) : 1;

  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let attempt: MockExamAttemptResponse | null = null;
  try {
    const res = await fetch(`${apiBaseUrl}/api/mock-exam-attempts/${attemptId}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });
    if (res.ok) {
      attempt = await res.json();
    }
  } catch {}

  if (!attempt) {
    redirect(`/simulacros/${id}`);
    return null;
  }

  if (attempt.finished) {
    redirect(`/simulacros/${id}/attempts/${attemptId}/result`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar session={session} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MockExamAttemptClient
          initialAttempt={attempt}
          initialPosition={requestedPosition}
          mockExamId={Number(id)}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
