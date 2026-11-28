"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  COMPLETE_HOLD_MS,
  getInternalNavigationTarget,
  NAVIGATION_SAFETY_TIMEOUT_MS,
  shouldTrackFetchRequest,
  SHOW_DELAY_MS,
  SPINNER_DELAY_MS,
  TRICKLE_INTERVAL_MS,
} from "@/app/lib/progressTracker";

interface ProgressSnapshot {
  visible: boolean;
  showSpinner: boolean;
  progress: number;
  completing: boolean;
}

const IDLE_SNAPSHOT: ProgressSnapshot = {
  visible: false,
  showSpinner: false,
  progress: 0,
  completing: false,
};

function nextTrickleProgress(current: number): number {
  let delta = 0.8;
  if (current < 40) {
    delta = 12;
  } else if (current < 70) {
    delta = 6;
  } else if (current < 85) {
    delta = 2.5;
  }
  return Math.min(92, Number((current + delta).toFixed(1)));
}

interface ProgressStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => ProgressSnapshot;
  getServerSnapshot: () => ProgressSnapshot;
  beginRequest: () => void;
  endRequest: () => void;
  beginNavigation: () => void;
  onRouteCommitted: (routeKey: string) => void;
  destroy: () => void;
}

function createProgressStore(): ProgressStore {
  let snapshot: ProgressSnapshot = IDLE_SNAPSHOT;
  let inFlightCount = 0;
  let isNavigating = false;
  let lastCommittedRoute: string | null = null;

  let showTimer: ReturnType<typeof setTimeout> | null = null;
  let spinnerTimer: ReturnType<typeof setTimeout> | null = null;
  let trickleTimer: ReturnType<typeof setInterval> | null = null;
  let completeTimer: ReturnType<typeof setTimeout> | null = null;
  let navSafetyTimer: ReturnType<typeof setTimeout> | null = null;

  const listeners = new Set<() => void>();

  function emit(next: ProgressSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function isBusy(): boolean {
    return inFlightCount > 0 || isNavigating;
  }

  function clearActiveTimers() {
    if (showTimer !== null) {
      clearTimeout(showTimer);
      showTimer = null;
    }
    if (spinnerTimer !== null) {
      clearTimeout(spinnerTimer);
      spinnerTimer = null;
    }
    if (trickleTimer !== null) {
      clearInterval(trickleTimer);
      trickleTimer = null;
    }
  }

  function clearNavSafetyTimer() {
    if (navSafetyTimer !== null) {
      clearTimeout(navSafetyTimer);
      navSafetyTimer = null;
    }
  }

  function startTrickle() {
    if (trickleTimer !== null) {
      return;
    }
    trickleTimer = setInterval(() => {
      if (!isBusy() || !snapshot.visible || snapshot.completing) {
        return;
      }
      emit({
        ...snapshot,
        progress: nextTrickleProgress(snapshot.progress),
      });
    }, TRICKLE_INTERVAL_MS);
  }

  function scheduleSpinner() {
    if (spinnerTimer !== null) {
      return;
    }
    spinnerTimer = setTimeout(() => {
      spinnerTimer = null;
      if (!isBusy()) {
        return;
      }
      startTrickle();
      emit({
        visible: true,
        showSpinner: true,
        progress: snapshot.visible ? snapshot.progress : 25,
        completing: false,
      });
    }, SPINNER_DELAY_MS);
  }

  function activateIfNeeded() {
    if (completeTimer !== null) {
      clearTimeout(completeTimer);
      completeTimer = null;
      emit({
        visible: true,
        showSpinner: false,
        progress: 20,
        completing: false,
      });
      startTrickle();
      scheduleSpinner();
      return;
    }

    if (snapshot.visible) {
      return;
    }

    if (showTimer === null) {
      showTimer = setTimeout(() => {
        showTimer = null;
        if (!isBusy()) {
          return;
        }
        emit({
          visible: true,
          showSpinner: snapshot.showSpinner,
          progress: 18,
          completing: false,
        });
        startTrickle();
      }, SHOW_DELAY_MS);
    }

    scheduleSpinner();
  }

  function maybeComplete() {
    if (isBusy()) {
      return;
    }

    clearActiveTimers();
    clearNavSafetyTimer();

    if (!snapshot.visible) {
      if (snapshot !== IDLE_SNAPSHOT) {
        emit(IDLE_SNAPSHOT);
      }
      return;
    }

    emit({
      ...snapshot,
      progress: 100,
      completing: true,
    });

    if (completeTimer !== null) {
      clearTimeout(completeTimer);
    }
    completeTimer = setTimeout(() => {
      completeTimer = null;
      if (!isBusy()) {
        emit(IDLE_SNAPSHOT);
      }
    }, COMPLETE_HOLD_MS);
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot() {
      return snapshot;
    },
    getServerSnapshot() {
      return IDLE_SNAPSHOT;
    },
    beginRequest() {
      inFlightCount += 1;
      activateIfNeeded();
    },
    endRequest() {
      inFlightCount = Math.max(0, inFlightCount - 1);
      maybeComplete();
    },
    beginNavigation() {
      isNavigating = true;
      clearNavSafetyTimer();
      navSafetyTimer = setTimeout(() => {
        navSafetyTimer = null;
        if (isNavigating) {
          isNavigating = false;
          maybeComplete();
        }
      }, NAVIGATION_SAFETY_TIMEOUT_MS);
      activateIfNeeded();
    },
    onRouteCommitted(routeKey: string) {
      if (lastCommittedRoute === null) {
        lastCommittedRoute = routeKey;
        return;
      }
      if (routeKey !== lastCommittedRoute) {
        lastCommittedRoute = routeKey;
        if (isNavigating) {
          isNavigating = false;
          maybeComplete();
        }
      }
    },
    destroy() {
      inFlightCount = 0;
      isNavigating = false;
      clearActiveTimers();
      clearNavSafetyTimer();
      if (completeTimer !== null) {
        clearTimeout(completeTimer);
        completeTimer = null;
      }
    },
  };
}

function RouteCommitWatcher({ store }: { store: ProgressStore }) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = searchParams ? searchParams.toString() : "";
  const routeKey = search ? `${pathname}?${search}` : pathname;

  useEffect(() => {
    store.onRouteCommitted(routeKey);
  }, [store, routeKey]);

  return null;
}

export default function GlobalTopProgress() {
  const [store] = useState<ProgressStore>(() => createProgressStore());
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const originalFetch = window.fetch;
    let wrappedFetch: typeof window.fetch | null = null;

    if (typeof originalFetch === "function") {
      wrappedFetch = async (input, init) => {
        const tracked = shouldTrackFetchRequest(input, init);
        if (tracked) {
          store.beginRequest();
        }
        try {
          return await originalFetch.call(window, input, init);
        } finally {
          if (tracked) {
            store.endRequest();
          }
        }
      };
      window.fetch = wrappedFetch;
    }

    const handleDocumentClick = (event: MouseEvent) => {
      const targetRoute = getInternalNavigationTarget(event, window.location);
      if (targetRoute !== null) {
        store.beginNavigation();
      }
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      if (wrappedFetch && window.fetch === wrappedFetch) {
        window.fetch = originalFetch;
      }
      store.destroy();
    };
  }, [store]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteCommitWatcher store={store} />
      </Suspense>

      {state.visible && (
        <>
          <div
            role="progressbar"
            aria-label="Cargando contenido"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(state.progress)}
            className={`fixed top-0 left-0 right-0 z-[100] h-[3px] pointer-events-none print:hidden transition-opacity duration-200 ${
              state.completing ? "opacity-0" : "opacity-100"
            }`}
          >
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 dark:from-blue-500 dark:via-indigo-400 dark:to-cyan-300 shadow-[0_0_10px_rgba(37,99,235,0.65)] transition-[width] duration-200 ease-out"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          {state.showSpinner && (
            <div
              data-testid="global-progress-spinner"
              aria-hidden="true"
              className={`fixed top-[4.25rem] right-4 z-[100] pointer-events-none print:hidden flex items-center justify-center w-7 h-7 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-700/80 shadow-md backdrop-blur-xs transition-opacity duration-200 ${
                state.completing ? "opacity-0" : "opacity-100"
              }`}
            >
              <span className="w-4 h-4 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent dark:border-t-transparent animate-spin" />
            </div>
          )}
        </>
      )}
    </>
  );
}
