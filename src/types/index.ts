// src/types/index.ts

// ─── API Response Envelope ───────────────────────────────────────────────────

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiError = {
  ok: false;
  error: string;
  status: number;
};

export type ApiResult<T> = ApiSuccess<T> | ApiError;

// ─── Domain Types ─────────────────────────────────────────────────────────────

export type UserProfile = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  favoriteMovie: string | null;
  onboarded: boolean;
};

export type MovieFact = {
  id: string;
  movie: string;
  fact: string;
  createdAt: string; // ISO string
};

// ─── Request / Response shapes ────────────────────────────────────────────────

export type UpdateMovieRequest = {
  movie: string;
};

export type UpdateMovieResponse = {
  favoriteMovie: string;
};

export type GetFactResponse = {
  fact: MovieFact;
  cached: boolean; // whether this came from the client-side cache
};

// ─── Client-side cache entry ─────────────────────────────────────────────────

export type FactCacheEntry = {
  fact: MovieFact;
  fetchedAt: number; // Date.now() ms timestamp
  movie: string;     // which movie this fact is for
};
