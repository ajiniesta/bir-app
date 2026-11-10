import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import MockExamResultClient from "./MockExamResultClient";
import { MockExamAttemptResponse, MyProposalResponse } from "../../../../types";

export const instant = false;

interface SimulacroResultPageProps {
  params: Promise<{
    id: string;
    attemptId: string;
  }>;
}

export default async function SimulacroResultPage(props: SimulacroResultPageProps) {
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
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let attempt: MockExamAttemptResponse | null = null;
  try {
    const res = await fetch(`${apiBaseUrl}/api/mock-exam-attempts/${attemptId}/result`, {
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

  let proposals: MyProposalResponse[] = [];
  if (attempt.items?.length) {
    const qIds = attempt.items
      .map((i) => i.questionId)
      .filter((qId): qId is number => typeof qId === "number");

    if (qIds.length > 0) {
      try {
        const query = qIds.map((qid) => `questionIds=${qid}`).join("&");
        const res = await fetch(`${apiBaseUrl}/api/proposals/mine?${query}`, {
          method: "GET",
          headers,
          cache: "no-store",
        });
        if (res.ok) {
          proposals = await res.json();
        }
      } catch {}
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-16">
      <Navbar session={session} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MockExamResultClient
          attempt={attempt}
          initialProposals={proposals}
          mockExamId={Number(id)}
          accessToken={user.accessToken}
        />
      </main>
    </div>
  );
}
