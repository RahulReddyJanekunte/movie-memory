// __tests__/api-client.test.ts
//
// Tests for lib/api.ts — the typed client wrapper.
// These verify that all error paths (401, 500, network, malformed JSON)
// are correctly normalised into ApiResult<T> without throwing.

import { getMe, updateMovie, getFact } from "@/lib/api";

// Helper: build a mock Response with JSON body
function mockFetch(status: number, body: unknown): jest.Mock {
  return jest.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValueOnce(body),
  });
}

// Helper: build a mock Response with non-JSON body (e.g. HTML error page)
function mockFetchNonJson(status: number): jest.Mock {
  return jest.fn().mockResolvedValueOnce({
    ok: false,
    status,
    json: jest.fn().mockRejectedValueOnce(new SyntaxError("Unexpected token")),
  });
}

// Helper: mock a network-level failure
function mockFetchNetworkError(message = "Network error"): jest.Mock {
  return jest.fn().mockRejectedValueOnce(new TypeError(message));
}

describe("API client — getMe()", () => {
  afterEach(() => jest.resetAllMocks());

  it("returns ok:true with typed UserProfile on 200", async () => {
    const mockProfile = {
      id: "user_1",
      name: "Alice",
      email: "alice@example.com",
      image: null,
      favoriteMovie: "Inception",
      onboarded: true,
    };
    global.fetch = mockFetch(200, mockProfile);

    const result = await getMe();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("alice@example.com");
      expect(result.data.favoriteMovie).toBe("Inception");
    }
  });

  it("returns ok:false with status 401 on unauthorized", async () => {
    global.fetch = mockFetch(401, { error: "Unauthorized" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
      expect(result.error).toBe("Unauthorized");
    }
  });

  it("returns ok:false on 500 with server error message", async () => {
    global.fetch = mockFetch(500, { error: "Internal server error" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toContain("Internal server error");
    }
  });

  it("returns ok:false with status 500 that has no error field", async () => {
    global.fetch = mockFetch(500, { message: "something broke" });

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      // Should fall back to a generic message
      expect(result.error).toContain("500");
    }
  });

  it("returns ok:false with status 0 on network failure", async () => {
    global.fetch = mockFetchNetworkError("Failed to fetch");

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(0);
      expect(result.error).toBe("Failed to fetch");
    }
  });

  it("returns ok:false when server returns non-JSON body", async () => {
    global.fetch = mockFetchNonJson(503);

    const result = await getMe();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toMatch(/Unexpected response/);
    }
  });
});

describe("API client — updateMovie()", () => {
  afterEach(() => jest.resetAllMocks());

  it("returns ok:true with updated movie on 200", async () => {
    global.fetch = mockFetch(200, { favoriteMovie: "The Matrix" });

    const result = await updateMovie("The Matrix");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.favoriteMovie).toBe("The Matrix");
    }
  });

  it("returns ok:false on 401", async () => {
    global.fetch = mockFetch(401, { error: "Unauthorized" });

    const result = await updateMovie("Interstellar");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(401);
    }
  });

  it("returns ok:false on 422 validation error", async () => {
    global.fetch = mockFetch(422, { error: "Movie title cannot be empty." });

    const result = await updateMovie("");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(422);
      expect(result.error).toBe("Movie title cannot be empty.");
    }
  });

  it("sends a PUT request with JSON body", async () => {
    const spy = mockFetch(200, { favoriteMovie: "Dune" });
    global.fetch = spy;

    await updateMovie("Dune");

    expect(spy).toHaveBeenCalledWith(
      "/api/me/movie",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ movie: "Dune" }),
      })
    );
  });
});

describe("API client — getFact()", () => {
  afterEach(() => jest.resetAllMocks());

  it("returns ok:true with MovieFact on 200", async () => {
    const mockFact = {
      id: "fact_1",
      movie: "Inception",
      fact: "The spinning top scene was never meant to imply what viewers think.",
      createdAt: new Date().toISOString(),
    };
    global.fetch = mockFetch(200, mockFact);

    const result = await getFact();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.fact).toContain("spinning top");
      expect(result.data.movie).toBe("Inception");
    }
  });

  it("returns ok:false on 503 when OpenAI fails and no cache exists", async () => {
    global.fetch = mockFetch(503, {
      error: "We couldn't generate a fact right now and have no saved facts to fall back on.",
    });

    const result = await getFact();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
    }
  });

  it("returns ok:false on 400 when no movie is set", async () => {
    global.fetch = mockFetch(400, { error: "No favorite movie set." });

    const result = await getFact();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
    }
  });
});
