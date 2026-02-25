// src/lib/openai.ts
import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Lightweight curated fallback facts used when the API provider fails
 * or returns an empty response. These are intentionally generic/safe.
 */
const FALLBACK_FACTS = [
  "Many films reuse props and set pieces across productions to save cost and time.",
  "Actors sometimes perform their own stunts, but productions usually employ professionals for dangerous sequences.",
  "Movie soundtracks are often recorded after filming during a process called ADR (automated dialogue replacement).",
  "A surprising number of iconic movie moments were improvised on set.",
];

const MOVIE_SPECIFIC: Record<string, string[]> = {
  "the godfather": [
    "Many of the extras in the wedding scene were real friends and family of the cast.",
  ],
  "star wars": [
    "The original lightsaber sounds were created by combining the hum of an old film projector and the interference from a TV set.",
  ],
  "pulp fiction": [
    "The famous diner sequence was shot in a single location that doubled for multiple places in the film.",
  ],
};

function pickFallback(movie: string) {
  const key = movie?.trim().toLowerCase();
  const specific = MOVIE_SPECIFIC[key];
  if (specific && specific.length) {
    return specific[Math.floor(Math.random() * specific.length)];
  }
  return FALLBACK_FACTS[Math.floor(Math.random() * FALLBACK_FACTS.length)];
}

/**
 * Generate a single interesting fact about a movie.
 * If the provider returns an empty response or errors repeatedly,
 * return a curated local fallback rather than throwing.
 */
export async function generateMovieFact(movie: string): Promise<string> {
  const maxAttempts = 2;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt += 1;
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a film expert. Return exactly one surprising, specific, and accurate fun fact about the given movie. Keep it to 1-2 sentences. No preamble.",
          },
          {
            role: "user",
            content: `Movie: "${movie}"`,
          },
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      const text = completion?.choices?.[0]?.message?.content?.trim();
      if (text) return text;

      // If response empty, throw to trigger retry/fallback logic
      throw new Error("Empty response from provider");
    } catch (err: any) {
      // For transient failures, retry once with exponential backoff
      if (attempt < maxAttempts) {
        const backoff = 300 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }

      // Final attempt failed — log full error and return local fallback
      console.error("[lib/openai] generateMovieFact error:", err?.message ?? err, {
        code: err?.code ?? null,
        status: err?.status ?? null,
      });

      return pickFallback(movie);
    }
  }

  // Fallback as a last resort
  return pickFallback(movie);
}

export default generateMovieFact;