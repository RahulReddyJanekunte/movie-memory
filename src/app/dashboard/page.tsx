// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Dashboard from "@/components/Dashboard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Not logged in → landing page
  if (!session?.user?.email) {
    redirect("/");
  }

  // First-time user (no movie set) → send to onboarding
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { favoriteMovie: true },
  });

  if (!user?.favoriteMovie) {
    redirect("/onboarding");
  }

  return <Dashboard />;
}