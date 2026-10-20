"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ViewMode = "list" | "cards";

const STORAGE_KEY = "reviewboard:view";
const listeners = new Set<() => void>();
// Used when storage is blocked (private mode), so the toggle still works for this visit
let memory: ViewMode | null = null;

function read(): ViewMode {
  if (memory) return memory;
  try {
    return localStorage.getItem(STORAGE_KEY) === "cards" ? "cards" : "list";
  } catch {
    return "list";
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Keep other open tabs in sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memory = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Card or list layout for submission lists, remembered per browser. */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, read, () => "list" as const);
  const setMode = useCallback((next: ViewMode) => {
    memory = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked — the in-memory value still applies
    }
    listeners.forEach((listener) => listener());
  }, []);
  return [mode, setMode];
}
