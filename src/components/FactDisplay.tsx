// src/components/FactDisplay.tsx
// Displays a movie fact with full loading, error, and empty states.

"use client";

import { useEffect } from "react";
import { useFactCache } from "@/hooks/useFactCache";

type Props = {
  movie: string;
};

export default function FactDisplay({ movie }: Props) {
  const { fact, isLoading, error, fetchFact, invalidate } = useFactCache();

  // Fetch on first render and when movie changes
  useEffect(() => {
    if (movie) {
      fetchFact(movie);
    } else {
      invalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie]);

  if (!movie) return null;

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          Fun Fact
        </h2>
        <button
          onClick={() => fetchFact(movie, true)}
          disabled={isLoading}
          className="text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-50 transition-colors"
          aria-label="Get a new fact"
        >
          {isLoading ? "Loading…" : "New fact ↻"}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && !fact && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
          Generating a fact…
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="text-sm text-red-600" role="alert">
          <p>{error}</p>
          <button
            onClick={() => fetchFact(movie, true)}
            className="mt-1 text-red-500 underline hover:text-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {/* Fact content */}
      {fact && !error && (
        <p className="text-sm leading-relaxed text-gray-700">{fact.fact}</p>
      )}

      {/* Loading overlay while refreshing an existing fact */}
      {fact && isLoading && (
        <p className="mt-2 text-xs text-indigo-400">Fetching a new fact…</p>
      )}
    </div>
  );
}
