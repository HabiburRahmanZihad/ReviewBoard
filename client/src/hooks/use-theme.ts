"use client";

import { useSyncExternalStore } from "react";
import { getThemePreference, setThemePreference, subscribeToTheme, ThemePreference } from "@/lib/theme";

export function useTheme(): [ThemePreference, (preference: ThemePreference) => void] {
  const preference = useSyncExternalStore(subscribeToTheme, getThemePreference, () => "system" as const);
  return [preference, setThemePreference];
}
