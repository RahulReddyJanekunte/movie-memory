# 🎬 Movie Memory

A small full-stack app where users sign in, save their favorite movie, and get a fun AI-generated fact about it.

I focused mainly on the frontend/API interaction, which is why I chose Variant B.

## Variant Chosen: **Variant B — Frontend / API-Focused**

### Why Variant B?

I picked Variant B because the interesting part of this project to me was how the frontend talks to the API.

Instead of calling fetch directly everywhere, I created a small typed client (lib/api.ts) so components don’t need to worry about request details or error handling.

It also made things like optimistic updates and caching easier to reason about.

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL (local or hosted, e.g. Supabase / Railway)
- A Google Cloud project with OAuth 2.0 credentials
- An OpenAI API key

### 1. Clone & install

```bash
git clone https://github.com/your-username/movie-memory.git
cd movie-memory
npm install
```

### 2. Environment variables

Create a .env.local file. Add your URL or keys

DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OPENAI_API_KEY=

**Google OAuth setup:**
1. Create a project → Enable "Google+ API" → Create OAuth 2.0 credentials
2. Add `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI

### 3. Database migration

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate
```

### 4. Run the dev server

```bash
npm run dev
# → http://localhost:3000
```

### 5. Run tests

```bash
npm test
```

## Architecture Overview

### Directory Structure

```
src/
├── app/                         # Next.js App Router pages + API routes
│   ├── page.tsx                 # Landing page (unauthenticated)
│   ├── onboarding/page.tsx      # First-time user flow
│   ├── dashboard/page.tsx       # Protected dashboard (server component)
│   └── api/
│       ├── auth/[...nextauth]/  # NextAuth handler
│       ├── me/route.ts          # GET /api/me
│       ├── me/movie/route.ts    # PUT /api/me/movie
│       └── fact/route.ts        # GET /api/fact
├── components/
│   ├── Dashboard.tsx            # Client component — owns UI state
│   ├── MovieEditor.tsx          # Inline editor with optimistic UI
│   ├── FactDisplay.tsx          # Fact renderer with loading/error states
│   ├── OnboardingForm.tsx       # First-time movie input
│   ├── SignInButton.tsx         # Google OAuth trigger
│   └── SessionProvider.tsx      # NextAuth session wrapper
├── hooks/
│   └── useFactCache.ts          # 30-second client-side fact cache
├── lib/
│   ├── api.ts                   # ⭐ Typed API client (Variant B core)
│   ├── auth.ts                  # NextAuth config
│   ├── db.ts                    # Prisma singleton
│   ├── openai.ts                # OpenAI singleton + fact generation
│   └── validation.ts            # Shared input validation (server-side)
└── types/
    └── index.ts                 # All shared types
```

### Data Model

```prisma
User        # Stores user info like name, email, image, favoriteMovie, and onboarding status
Account     # OAuth provider accounts handled by NextAuth
Session     # Active login sessions managed by NextAuth
MovieFact   # AI-generated facts tied to a user and movie
```

The `MovieFact` table is append-only — each generation creates a new row. This gives us an audit trail and cheap fallback: when OpenAI fails, we query `findFirst` ordered by `createdAt DESC` scoped to the current user.

To keep this lookup efficient, the table includes an index on:

`(userId, movie, createdAt DESC)`

which allows the database to quickly return the latest fact.

### Auth Flow

Authentication is implemented using NextAuth with Google OAuth.

Flow:
1. User signs in with Google.
2. A session is created.
3. The user record is stored in the database.
4. The session is used to authorize API routes.

unauthenticated
  └─→ "Sign in with Google"
        └─→ First visit  → /onboarding
        └─→ Return visit → /dashboard

This approach avoids having to build a custom authentication system while still being secure and production-ready.

### API Layer (Variant B core — `lib/api.ts`)

All client-side requests go through a small API helper instead of directly calling fetch.

Example responsibility of the API helper:

• Sending requests
• Parsing JSON responses
• Handling common error cases
• Keeping request logic consistent

This prevents repeated networking code inside components and makes the code easier to test.

## Key Tradeoffs

Custom caching vs library

A library like SWR or React Query could simplify caching, but implementing it manually made the logic explicit and easier to explain for the purpose of the assignment.

Append-only fact history

Facts accumulate instead of being replaced.
This slightly increases storage usage but simplifies fallback behavior.

Simple state management

Global state libraries were avoided to keep the project lightweight.

## What I Would Improve With 2 More Hours

1. **Rate limiting on `/api/fact`** — add a simple per-user rate limit (e.g. Redis or DB-based) so users can't hammer OpenAI
2. **Middleware-based auth guard** — move auth redirects to `middleware.ts` for earlier interception and cleaner page components
3. **`useFactCache` persistence** — store the cache in `sessionStorage` so refreshing the page within the TTL doesn't re-hit the API
4. **Skeleton loaders** — replace the spinner in `Dashboard` with proper skeleton UI for name, email, and movie rows
5. **E2E tests** — add Playwright tests covering the full auth → onboarding → dashboard flow

## AI Usage

- Used Claude to scaffold the initial `useFactCache` hook structure and refine the `ApiResult<T>` discriminated union pattern
- Used GitHub Copilot for repetitive boilerplate (Tailwind class names, Prisma query syntax)
- All architectural decisions, type contracts, error handling strategies, and test cases were written and reasoned through manually
- Used ChatGPT to sanity-check the NextAuth + Prisma Adapter configuration for App Router

All architecture decisions, code structure, and implementation were written and reviewed manually.