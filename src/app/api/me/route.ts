// src/app/api/me/route.ts
// GET /api/me — returns the authenticated user's profile.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserProfile } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch from DB rather than relying solely on session data so we always
  // return the freshest favoriteMovie value.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      favoriteMovie: true,
      onboarded: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const profile: UserProfile = {
    id: user.id,
    name: user.name ?? null,
    email: user.email,
    image: user.image ?? null,
    favoriteMovie: user.favoriteMovie ?? null,
    onboarded: user.onboarded,
  };

  return NextResponse.json(profile);
}
