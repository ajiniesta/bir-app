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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <p className="text-sm text-gray-600">Cerrando sesión...</p>
    </main>
  );
}
