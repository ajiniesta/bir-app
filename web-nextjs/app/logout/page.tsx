"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    signOut({ redirect: false }).finally(() => {
      router.push("/");
      router.refresh?.();
    });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 px-4 py-8">
      <p className="text-sm text-slate-600 dark:text-slate-400">Cerrando sesión...</p>
    </main>
  );
}
