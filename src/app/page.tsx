// app/page.tsx
// Root landing page — shown to unauthenticated visitors.
// Authenticated users are redirected straight to /dashboard.

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SignInButton from "@/components/SignInButton";

export default async function LandingPage() {
  // If already signed in, skip the landing page entirely
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        {/* Branding */}
        <div className="mb-8 text-center">
          <span className="text-5xl">🎬</span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Movie Memory</h1>
          <p className="mt-2 text-sm text-gray-500">
            Save your favorite movie and discover fun facts about it.
          </p>
        </div>

        {/* Google Sign-In */}
        <SignInButton />

        <p className="mt-5 text-center text-xs text-gray-400">
          We only use your Google account to identify you.
          <br />
          No passwords. No spam.
        </p>
      </div>
    </main>
  );
}