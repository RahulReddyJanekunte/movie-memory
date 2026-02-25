// src/components/OnboardingForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMovie } from "@/lib/api";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";

export default function OnboardingForm() {
  const router = useRouter();
  const [movie, setMovie] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = movie.trim();
    if (!trimmed) {
      setError("Please enter your favorite movie.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await updateMovie(trimmed);

    if (!result.ok) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div>
        <label
          htmlFor="movie"
          className="block text-sm font-medium text-gray-700"
        >
          Favorite movie
        </label>
        <input
          id="movie"
          type="text"
          value={movie}
          onChange={(e) => setMovie(e.target.value)}
          maxLength={MOVIE_MAX_LENGTH}
          placeholder="e.g. Inception"
          disabled={isSubmitting}
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          aria-describedby={error ? "movie-error" : undefined}
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {movie.trim().length}/{MOVIE_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <p id="movie-error" className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || !movie.trim()}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
      >
        {isSubmitting ? "Saving…" : "Continue to dashboard →"}
      </button>
    </form>
  );
}
