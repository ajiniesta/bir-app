import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import FreePlayClient from "./FreePlayClient";
import { FreeSessionResponse, MyProposalResponse } from "../types";

export const instant = false;

interface FreePlayPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function FreePlayPage(props: FreePlayPageProps) {
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

  const { id } = await props.params;
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:18080";
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (user.accessToken) {
    headers.Authorization = `Bearer ${user.accessToken}`;
  }

  let freeSession: FreeSessionResponse | null = null;
  let notFound = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/free-sessions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.ok) {
      freeSession = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  if (freeSession?.finished) {
    redirect(`/free/${id}/result`);
    return null;
  }

  let proposals: MyProposalResponse[] = [];
  if (freeSession && freeSession.items?.length) {
    const qIds = freeSession.items
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Modo libre</h1>

        {notFound || !freeSession ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Partida no encontrada.</p>
            <div>
              <Link
                href="/free"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a configuración
              </Link>
            </div>
          </div>
        ) : (
          <FreePlayClient
            initialSession={freeSession}
            initialProposals={proposals}
            accessToken={user.accessToken}
          />
        )}
      </main>
    </div>
  );
}
