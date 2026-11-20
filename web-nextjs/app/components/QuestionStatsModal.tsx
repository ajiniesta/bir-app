"use client";

import { useEffect, useState } from "react";

export interface ScopeStats {
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface QuestionStatsResponse {
  questionId: number;
  platform: ScopeStats;
  user: ScopeStats;
}

interface QuestionStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: number;
  accessToken?: string;
}

const OUTER_RADIUS = 80;
const INNER_RADIUS = 46;
const STROKE_WIDTH = 22;
const CENTER = 110;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function QuestionStatsModal({
  isOpen,
  onClose,
  questionId,
  accessToken,
}: QuestionStatsModalProps) {
  const [stats, setStats] = useState<QuestionStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadStats() {
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch(`/api/stats/questions/${questionId}`, {
          method: "GET",
          headers,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error || "No se pudieron cargar las estadísticas de la pregunta"
          );
        }

        const data: QuestionStatsResponse = await res.json();
        if (!cancelled) {
          setStats(data);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las estadísticas de la pregunta"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, [isOpen, questionId, accessToken]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const outerCircumference = 2 * Math.PI * OUTER_RADIUS;
  const innerCircumference = 2 * Math.PI * INNER_RADIUS;

  const platformAccuracy = clampPercent(stats?.platform?.accuracy ?? 0);
  const userAccuracy = clampPercent(stats?.user?.accuracy ?? 0);

  const outerCorrectDash = (platformAccuracy / 100) * outerCircumference;
  const innerCorrectDash = (userAccuracy / 100) * innerCircumference;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="question-stats-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2
              id="question-stats-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Estadísticas de la pregunta #{questionId}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Anillo exterior: toda la plataforma · Anillo interior: tu historial
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {loading && (
          <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Cargando estadísticas...
          </div>
        )}

        {error && !loading && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 dark:bg-red-950/40 p-4 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {stats && !loading && !error && (
          <div className="space-y-5">
            {/* Concentric Pie Charts */}
            <div className="flex flex-col items-center justify-center">
              <svg
                data-testid="concentric-pie-chart"
                viewBox="0 0 220 220"
                className="w-52 h-52"
                role="img"
                aria-label="Gráfico de tarta concéntrico: exterior toda la plataforma, interior usuario autenticado"
              >
                {/* OUTER RING: Toda la plataforma */}
                <g
                  data-testid="platform-pie-ring"
                  data-radius={OUTER_RADIUS}
                  data-scope="platform"
                >
                  {stats.platform.answered > 0 ? (
                    <>
                      {/* Base ring (fallos plataforma) */}
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={OUTER_RADIUS}
                        fill="transparent"
                        stroke="#ef4444"
                        strokeWidth={STROKE_WIDTH}
                      />
                      {/* Foreground arc (aciertos plataforma) */}
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={OUTER_RADIUS}
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${outerCorrectDash} ${outerCircumference}`}
                        transform={`rotate(-90 ${CENTER} ${CENTER})`}
                        strokeLinecap="butt"
                      />
                    </>
                  ) : (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={OUTER_RADIUS}
                      fill="transparent"
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeWidth={STROKE_WIDTH}
                    />
                  )}
                </g>

                {/* INNER RING: Usuario autenticado */}
                <g
                  data-testid="user-pie-ring"
                  data-radius={INNER_RADIUS}
                  data-scope="user"
                >
                  {stats.user.answered > 0 ? (
                    <>
                      {/* Base ring (fallos usuario) */}
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={INNER_RADIUS}
                        fill="transparent"
                        stroke="#f97316"
                        strokeWidth={STROKE_WIDTH}
                      />
                      {/* Foreground arc (aciertos usuario) */}
                      <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={INNER_RADIUS}
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth={STROKE_WIDTH}
                        strokeDasharray={`${innerCorrectDash} ${innerCircumference}`}
                        transform={`rotate(-90 ${CENTER} ${CENTER})`}
                        strokeLinecap="butt"
                      />
                    </>
                  ) : (
                    <circle
                      cx={CENTER}
                      cy={CENTER}
                      r={INNER_RADIUS}
                      fill="transparent"
                      className="stroke-slate-200 dark:stroke-slate-800"
                      strokeWidth={STROKE_WIDTH}
                    />
                  )}
                </g>
              </svg>

              {/* Chart Legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400 mt-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Exterior: Acierto plataforma</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  <span>Exterior: Fallo plataforma</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>Interior: Tu acierto</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                  <span>Interior: Tu fallo</span>
                </span>
              </div>
            </div>

            {/* Summary Cards: Platform (Outer) & User (Inner) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Toda la plataforma */}
              <div
                data-testid="platform-stats-summary"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Toda la plataforma
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    Exterior
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats.platform.answered}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      veces respondida
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.platform.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      % de acierto
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                  {stats.platform.correct} aciertos · {stats.platform.incorrect} fallos
                </div>
              </div>

              {/* Usuario autenticado */}
              <div
                data-testid="user-stats-summary"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    Tu historial
                  </span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
                    Interior
                  </span>
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                      {stats.user.answered}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      veces respondida
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.user.accuracy.toFixed(1)}%
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      % de acierto
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/70 dark:border-slate-700/60">
                  {stats.user.correct} aciertos · {stats.user.incorrect} fallos
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
