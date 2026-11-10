"use client";

import { useState } from "react";
import ChangePasswordModal from "./ChangePasswordModal";

interface ChangePasswordButtonProps {
  accessToken?: string;
}

export default function ChangePasswordButton({ accessToken }: ChangePasswordButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        Cambiar contraseña
      </button>

      <ChangePasswordModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        accessToken={accessToken}
      />
    </>
  );
}
