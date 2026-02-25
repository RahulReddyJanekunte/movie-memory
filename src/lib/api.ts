// src/lib/api.ts
//
// Typed client wrapper for all browser → server API calls.
//
// Design goals:
//   1. Every call returns ApiResult<T> — callers never deal with raw fetch errors.
//   2. All request/response shapes are statically typed end-to-end.
//   3. A single `request` helper owns retry-less error normalisation so call
//      sites stay clean.
//   4. 401 responses are surfaced as structured errors so the UI can react
//      (e.g. redirect to login) without parsing status codes everywhere.

import type {
  ApiResult,
  UserProfile,
  UpdateMovieRequest,
  UpdateMovieResponse,
  MovieFact,
} from "@/types";

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    // Parse body regardless of status — our API always returns JSON
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // Non-JSON body (e.g. Next.js 404 HTML page)
      return {
        ok: false,
        error: `Unexpected response from server (${res.status})`,
        status: res.status,
      };
    }

    if (!res.ok) {
      const message =
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as Record<string, unknown>).error === "string"
          ? (body as { error: string }).error
          : `Request failed with status ${res.status}`;

      return { ok: false, error: message, status: res.status };
    }

    return { ok: true, data: body as T };
  } catch (err) {
    // Network-level failure (offline, DNS, CORS, etc.)
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
      status: 0,
    };
  }
}

// ─── API surface ──────────────────────────────────────────────────────────────

/**
 * GET /api/me
 * Returns the authenticated user's profile including their favorite movie.
 */
export async function getMe(): Promise<ApiResult<UserProfile>> {
  return request<UserProfile>("/api/me");
}

/**
 * PUT /api/me/movie
 * Updates the authenticated user's favorite movie.
 */
export async function updateMovie(
  movie: string
): Promise<ApiResult<UpdateMovieResponse>> {
  const body: UpdateMovieRequest = { movie };
  return request<UpdateMovieResponse>("/api/me/movie", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

/**
 * GET /api/fact
 * Returns (or generates) a fun fact for the user's current favorite movie.
 */
export async function getFact(): Promise<ApiResult<MovieFact>> {
  return request<MovieFact>("/api/fact");
}
