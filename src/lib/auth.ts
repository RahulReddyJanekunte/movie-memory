// src/lib/auth.ts
// Central NextAuth config — imported by both the route handler and server utilities.

import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  session: {
    strategy: "database",
  },

  callbacks: {
    // Expose the DB user id on the session so API routes can use it directly
    // without an extra DB round-trip.
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.onboarded = (user as { onboarded?: boolean }).onboarded ?? false;
        // image may be null if Google doesn't provide one — handle gracefully
        session.user.image = user.image ?? null;
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
    newUser: "/onboarding",
  },
};

// Augment NextAuth types so TypeScript knows about our custom fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      onboarded?: boolean;
    };
  }

  interface User {
    onboarded?: boolean;
  }
}
