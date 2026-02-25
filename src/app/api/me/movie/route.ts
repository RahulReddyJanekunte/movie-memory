// src/app/api/me/movie/route.ts
// PUT /api/me/movie — update the authenticated user's favorite movie.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { validateMovie } from "@/lib/validation";
import type { UpdateMovieResponse } from "@/types";

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const movieInput =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).movie
      : undefined;

  const validation = validateMovie(movieInput);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  // Update the user record — scoped strictly to the authenticated user's id
  // so one user can never modify another's data.
  const updated = await db.user.update({
    where: { id: session.user.id },
    data: {
      favoriteMovie: validation.value,
      onboarded: true,
    },
    select: { favoriteMovie: true },
  });

  const response: UpdateMovieResponse = {
    favoriteMovie: updated.favoriteMovie!,
  };

  return NextResponse.json(response);
}
