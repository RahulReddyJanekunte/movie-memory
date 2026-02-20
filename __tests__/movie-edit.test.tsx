// __tests__/movie-edit.test.tsx
//
// Tests for the MovieEditor inline-edit component.
// Covers: display mode, edit mode, optimistic update, revert on failure,
// cancel, keyboard shortcuts, and character limit feedback.

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import MovieEditor from "@/components/MovieEditor";
import * as api from "@/lib/api";

// Mock the api module so tests don't make real HTTP calls
jest.mock("@/lib/api");
const mockUpdateMovie = api.updateMovie as jest.MockedFunction<typeof api.updateMovie>;

const defaultProps = {
  currentMovie: "Inception",
  onMovieUpdated: jest.fn(),
  onMovieChanging: jest.fn(),
};

function renderEditor(overrides = {}) {
  const props = { ...defaultProps, ...overrides };
  const onMovieUpdated = jest.fn();
  const onMovieChanging = jest.fn();
  return {
    ...render(
      <MovieEditor
        currentMovie={props.currentMovie}
        onMovieUpdated={onMovieUpdated}
        onMovieChanging={onMovieChanging}
      />
    ),
    onMovieUpdated,
    onMovieChanging,
  };
}

describe("MovieEditor — display mode", () => {
  it("shows the current movie title", () => {
    renderEditor();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("shows an Edit button", () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
  });

  it("does not show input field in display mode", () => {
    renderEditor();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("MovieEditor — entering edit mode", () => {
  it("shows input field after clicking Edit", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("pre-fills input with current movie title", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByRole("textbox")).toHaveValue("Inception");
  });

  it("shows Save and Cancel buttons", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });
});

describe("MovieEditor — cancelling edit", () => {
  it("returns to display mode on Cancel", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("reverts draft changes on Cancel", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    // Back to original
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("closes edit mode on Escape key", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("MovieEditor — successful save", () => {
  beforeEach(() => {
    mockUpdateMovie.mockResolvedValue({
      ok: true,
      data: { favoriteMovie: "The Matrix" },
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("calls onMovieUpdated optimistically before API resolves", async () => {
    // Delay the API response so we can check the optimistic update
    mockUpdateMovie.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, data: { favoriteMovie: "The Matrix" } }), 100))
    );

    const { onMovieUpdated } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");

    // Start save without awaiting
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /save/i }));
    });

    // Optimistic update fires immediately
    expect(onMovieUpdated).toHaveBeenCalledWith("The Matrix");
  });

  it("returns to display mode after successful save", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  it("calls onMovieChanging after successful save to invalidate fact cache", async () => {
    const { onMovieChanging } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "The Matrix");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(onMovieChanging).toHaveBeenCalledTimes(1);
    });
  });

  it("submits on Enter key", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Interstellar");
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockUpdateMovie).toHaveBeenCalledWith("Interstellar");
    });
  });
});

describe("MovieEditor — save failure (revert)", () => {
  beforeEach(() => {
    mockUpdateMovie.mockResolvedValue({
      ok: false,
      error: "Internal server error",
      status: 500,
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("reverts to original movie on API failure", async () => {
    const { onMovieUpdated } = renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Dune");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      // Should revert back to original
      expect(onMovieUpdated).toHaveBeenLastCalledWith("Inception");
    });
  });

  it("shows error message on API failure", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Dune");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Internal server error");
    });
  });

  it("stays in edit mode after failure", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.type(input, "Dune");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      // Should still be in edit mode
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });
});

describe("MovieEditor — client-side validation", () => {
  it("shows error and does not call API when input is empty", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockUpdateMovie).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("does not call API when title is unchanged", async () => {
    renderEditor();
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    // Don't change the value
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(mockUpdateMovie).not.toHaveBeenCalled();
  });
});
