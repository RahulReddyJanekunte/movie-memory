// src/components/MovieEditor.tsx
//
// Inline movie editor with:
//   - Optimistic UI: shows new title immediately on Save
//   - Revert: if the server returns an error, the old title is restored
//   - Client-side length guard (mirrors server validation for fast feedback)
//   - Exposed via a simple callback so the parent owns the source of truth

"use client";

import { useState, useRef, useEffect } from "react";
import { updateMovie } from "@/lib/api";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";

type Props = {
  currentMovie: string;
  onMovieUpdated: (newMovie: string) => void;
  onMovieChanging: () => void; // called when save succeeds, used to invalidate fact cache
};

export default function MovieEditor({
  currentMovie,
  onMovieUpdated,
  onMovieChanging,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(currentMovie);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync if parent updates currentMovie (e.g. initial load)
  useEffect(() => {
    if (!isEditing) {
      setDraft(currentMovie);
    }
  }, [currentMovie, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function handleEdit() {
    setDraft(currentMovie);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraft(currentMovie);
    setError(null);
    setIsEditing(false);
  }

  async function handleSave() {
    const trimmed = draft.trim();

    if (!trimmed) {
      setError("Movie title cannot be empty.");
      return;
    }
    if (trimmed.length > MOVIE_MAX_LENGTH) {
      setError(`Must be ${MOVIE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (trimmed === currentMovie) {
      // Nothing changed — just close the editor
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    // ── Optimistic update: show new value immediately ──────────────────────
    onMovieUpdated(trimmed);

    const result = await updateMovie(trimmed);

    setIsSaving(false);

    if (!result.ok) {
      // ── Revert on failure ───────────────────────────────────────────────
      onMovieUpdated(currentMovie);
      setDraft(currentMovie);
      setError(result.error);
      return;
    }

    // Confirmed success
    onMovieChanging(); // invalidate fact cache since movie changed
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-lg font-medium text-gray-900">{currentMovie}</span>
        <button
          onClick={handleEdit}
          className="text-sm text-indigo-600 hover:text-indigo-800 underline underline-offset-2 transition-colors"
          aria-label="Edit favorite movie"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MOVIE_MAX_LENGTH}
          disabled={isSaving}
          className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
          aria-label="Favorite movie title"
        />
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <p className="text-xs text-gray-400">
        {draft.trim().length}/{MOVIE_MAX_LENGTH} · Press Enter to save, Esc to cancel
      </p>
    </div>
  );
}
