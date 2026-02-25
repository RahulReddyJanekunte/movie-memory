// src/lib/validation.ts

export const MOVIE_MIN_LENGTH = 1;
export const MOVIE_MAX_LENGTH = 200;

export type ValidationResult =
  | { valid: true; value: string }
  | { valid: false; error: string };

/**
 * Validates and sanitises a movie title submitted by the user.
 * All validation is performed server-side — client inputs are untrusted.
 */
export function validateMovie(input: unknown): ValidationResult {
  if (typeof input !== "string") {
    return { valid: false, error: "Movie title must be a string." };
  }

  const trimmed = input.trim();

  if (trimmed.length < MOVIE_MIN_LENGTH) {
    return { valid: false, error: "Movie title cannot be empty." };
  }

  if (trimmed.length > MOVIE_MAX_LENGTH) {
    return {
      valid: false,
      error: `Movie title must be ${MOVIE_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { valid: true, value: trimmed };
}
