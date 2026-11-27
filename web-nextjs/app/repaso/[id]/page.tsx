import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Navbar from "@/app/components/Navbar";
import RepasoPlayClient from "./RepasoPlayClient";
import { ReviewSessionResponse } from "../types";

export const instant = false;

interface RepasoPlayPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RepasoPlayPage(props: RepasoPlayPageProps) {
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

  let reviewSession: ReviewSessionResponse | null = null;
  let notFound = false;
  let unauthorized = false;

  try {
    const res = await fetch(`${apiBaseUrl}/api/review-sessions/${id}`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (res.status === 401) {
      unauthorized = true;
    } else if (res.ok) {
      reviewSession = await res.json();
    } else {
      notFound = true;
    }
  } catch {
    notFound = true;
  }

  if (unauthorized) {
    redirect("/logout");
    return null;
  }

  if (reviewSession?.finished) {
    redirect(`/repaso/${id}/result`);
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar session={session} />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Modo repaso
        </h1>

        {notFound || !reviewSession ? (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 p-6 text-center text-sm text-amber-800 dark:text-amber-300 space-y-3">
            <p>Repaso no encontrado.</p>
            <div>
              <Link
                href="/repaso"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Volver a configuración
              </Link>
            </div>
          </div>
        ) : (
          <RepasoPlayClient
            initialSession={reviewSession}
            accessToken={user.accessToken}
          />
        )}
      </main>
    </div>
  );
}
