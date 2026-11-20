"use client";

import { useState } from "react";
import QuestionStatsModal from "./QuestionStatsModal";

interface QuestionStatsButtonProps {
  questionId: number;
  accessToken?: string;
  className?: string;
  label?: string;
}

export default function QuestionStatsButton({
  questionId,
  accessToken,
  className,
  label = "Estadísticas",
}: QuestionStatsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const defaultClassName =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className || defaultClassName}
      >
        <svg
          className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
          />
        </svg>
        <span>{label}</span>
      </button>

      <QuestionStatsModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        questionId={questionId}
        accessToken={accessToken}
      />
    </>
  );
}
