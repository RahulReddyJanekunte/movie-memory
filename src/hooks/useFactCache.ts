// src/hooks/useFactCache.ts
//
// Manages client-side fact caching (Variant B requirement).
//
// Strategy: React state + timestamp comparison.
//   - Cache is stored in module-level state so it survives re-renders but
//     is cleared on full page navigation (intentional — keeps things simple).
//   - Cache is keyed on movie title so changing the movie auto-invalidates.
//   - TTL is 30 seconds per spec.
//
// Why not SWR / React Query?
//   The spec asks for a small, explicit cache we can reason about and test.
//   A custom hook keeps the logic visible and avoids a heavy dependency for
//   something this scoped.

import { useState, useCallback, useRef } from "react";
import type { FactCacheEntry, MovieFact } from "@/types";
import { getFact } from "@/lib/api";

const CACHE_TTL_MS = 30_000; // 30 seconds

type UseFactCacheReturn = {
  fact: MovieFact | null;
  isLoading: boolean;
  error: string | null;
  fetchFact: (movie: string, forceRefresh?: boolean) => Promise<void>;
  invalidate: () => void;
};

export function useFactCache(): UseFactCacheReturn {
  const [fact, setFact] = useState<MovieFact | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache stored in a ref so it doesn't cause extra re-renders
  const cacheRef = useRef<FactCacheEntry | null>(null);

  const invalidate = useCallback(() => {
    cacheRef.current = null;
    setFact(null);
    setError(null);
  }, []);

  const fetchFact = useCallback(
    async (movie: string, forceRefresh = false) => {
      const now = Date.now();
      const cached = cacheRef.current;

      // Return cached value if:
      //   1. Cache exists
      //   2. It's for the same movie
      //   3. It's within the TTL
      //   4. The user hasn't explicitly requested a refresh
      if (
        !forceRefresh &&
        cached &&
        cached.movie === movie &&
        now - cached.fetchedAt < CACHE_TTL_MS
      ) {
        setFact(cached.fact);
        return;
      }

      setIsLoading(true);
      setError(null);

      const result = await getFact();

      setIsLoading(false);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const entry: FactCacheEntry = {
        fact: result.data,
        fetchedAt: now,
        movie,
      };

      cacheRef.current = entry;
      setFact(result.data);
    },
    []
  );

  return { fact, isLoading, error, fetchFact, invalidate };
}
