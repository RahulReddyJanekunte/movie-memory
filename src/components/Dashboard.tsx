// src/components/Dashboard.tsx
// Client component that owns the dashboard state:
//   - User profile (loaded via typed API client)
//   - Inline movie editing with optimistic updates
//   - Fact display with client-side cache

"use client";

import { useState, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import MovieEditor from "@/components/MovieEditor";
import FactDisplay from "@/components/FactDisplay";
import { getMe } from "@/lib/api";
import type { UserProfile } from "@/types";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Separate movie state for optimistic updates — decoupled from profile
  const [movie, setMovie] = useState<string>("");
  // Bump this to force FactDisplay to re-fetch when movie changes
  const [factKey, setFactKey] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const result = await getMe();
      setIsLoading(false);

      if (!result.ok) {
        if (result.status === 401) {
          // Session expired — redirect to login
          window.location.href = "/";
          return;
        }
        setError(result.error);
        return;
      }

      setProfile(result.data);
      setMovie(result.data.favoriteMovie ?? "");
    }

    loadProfile();
  }, []);

  const handleMovieUpdated = useCallback((newMovie: string) => {
    setMovie(newMovie);
  }, []);

  const handleMovieChanging = useCallback(() => {
    // Invalidate the fact display so it re-fetches for the new movie
    setFactKey((k) => k + 1);
  }, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" />
          Loading your profile…
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-indigo-600 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <span className="text-lg font-semibold text-indigo-700">🎬 Movie Memory</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-6 py-10 space-y-8">
        {/* Profile card */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-4">
            {/* Avatar — gracefully handles missing photo */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-indigo-100">
              {profile.image ? (
                <Image
                  src={profile.image}
                  alt={profile.name ?? "Profile photo"}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-indigo-400">
                  {(profile.name ?? profile.email)[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {/* Name — fallback to email if missing */}
              <h1 className="text-xl font-semibold text-gray-900 truncate">
                {profile.name ?? profile.email}
              </h1>
              <p className="text-sm text-gray-500 truncate">{profile.email}</p>
            </div>
          </div>
        </section>

        {/* Favorite movie */}
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Favorite Movie
          </h2>
          {movie ? (
            <MovieEditor
              currentMovie={movie}
              onMovieUpdated={handleMovieUpdated}
              onMovieChanging={handleMovieChanging}
            />
          ) : (
            <p className="text-sm text-gray-500">No favorite movie set.</p>
          )}
        </section>

        {/* Fun fact */}
        {movie && (
          <FactDisplay
            key={factKey}
            movie={movie}
          />
        )}
      </main>
    </div>
  );
}
