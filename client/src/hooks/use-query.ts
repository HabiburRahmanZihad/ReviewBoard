"use client";

import { useCallback, useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/api";

type Fetcher<T> = (signal: AbortSignal) => Promise<T>;

interface Settled<T> {
  fetcher: Fetcher<T>;
  version: number;
  data?: T;
  error?: string;
}

/**
 * Minimal data-fetching hook.
 *
 * - Runs `fetcher` whenever its identity changes, so wrap it in `useCallback`
 *   with the request parameters as dependencies.
 * - Aborts the previous request first, so a slow stale response can never
 *   overwrite a newer one (e.g. typing quickly in a search box).
 * - Keeps the last successful data on screen while the next request is in
 *   flight, so tables dim instead of collapsing into a spinner.
 * - `refetch()` re-runs the same request, e.g. after a mutation.
 */
export function useQuery<T>(fetcher: Fetcher<T>) {
  const [version, setVersion] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetcher(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ fetcher, version, data });
      },
      (error) => {
        if (controller.signal.aborted) return;
        setSettled((prev) => ({ fetcher, version, data: prev?.data, error: getErrorMessage(error) }));
      }
    );
    return () => controller.abort();
  }, [fetcher, version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  const isLoading = settled?.fetcher !== fetcher || settled.version !== version;

  return {
    data: settled?.data,
    error: isLoading ? undefined : settled?.error,
    isLoading,
    refetch,
  };
}
