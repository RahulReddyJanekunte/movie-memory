// src/app/api/fact/route.ts
// GET /api/fact — returns a fun fact about the user's current favorite movie.
//
// Server-side behaviour:
//   - Generates a new fact via OpenAI and stores it in the DB every request.
//     (Client-side caching per Variant B spec handles the 30s reuse window.)
//   - If OpenAI fails, falls back to the most recent stored fact.
//   - If no fact exists and OpenAI fails, returns a 503 with a friendly error.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateMovieFact } from "@/lib/openai";
import type { MovieFact } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the user's current favorite movie — authoritative source is always DB.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    return NextResponse.json(
      { error: "No favorite movie set. Please complete onboarding." },
      { status: 400 }
    );
  }

  const { favoriteMovie } = user;

  // Try to generate a fresh fact
  try {
    const factText = await generateMovieFact(favoriteMovie);

    const saved = await db.movieFact.create({
      data: {
        userId: session.user.id,
        movie: favoriteMovie,
        fact: factText,
      },
    });

    const response: MovieFact = {
      id: saved.id,
      movie: saved.movie,
      fact: saved.fact,
      createdAt: saved.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (openAiError) {
    console.error("[/api/fact] OpenAI error:", openAiError);

    // Graceful degradation: return the most recent stored fact if available.
    // Security note: we scope the query to session.user.id so users can never
    // read facts belonging to another user.
    const cached = await db.movieFact.findFirst({
      where: {
        userId: session.user.id,
        movie: favoriteMovie,
      },
      orderBy: { createdAt: "desc" },
    });

    if (cached) {
      const response: MovieFact = {
        id: cached.id,
        movie: cached.movie,
        fact: cached.fact,
        createdAt: cached.createdAt.toISOString(),
      };
      // 200 with stale data — client doesn't need to know it's from cache
      return NextResponse.json(response);
    }

    return NextResponse.json(
      {
        error:
          "We couldn't generate a fact right now and have no saved facts to fall back on. Please try again in a moment.",
      },
      { status: 503 }
    );
  }
}
