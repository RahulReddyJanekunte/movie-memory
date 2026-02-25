// src/app/onboarding/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import OnboardingForm from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);

  // Not logged in → landing page
  if (!session?.user?.email) {
    redirect("/");
  }

  // Already onboarded → skip to dashboard
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { favoriteMovie: true },
  });

  if (user?.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <span className="text-3xl">🎬</span>
          <h1 className="mt-3 text-xl font-bold text-gray-900">
            Welcome, {session.user.name?.split(" ")[0] ?? "there"}!
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            What&apos;s your all-time favorite movie?
          </p>
        </div>
        <OnboardingForm />
      </div>
    </main>
  );
}