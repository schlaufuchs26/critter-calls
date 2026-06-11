import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "../frontend";

describe("Critter Calls", () => {
  test("renders the title on mode select screen", () => {
    render(<App />);
    expect(screen.getByText("🔊 Critter Calls")).toBeInTheDocument();
  });

  test("shows Classic and Daily mode buttons", () => {
    render(<App />);
    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("Daily Challenge")).toBeInTheDocument();
  });

  test("clicking Classic starts the game", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));
    expect(screen.getByTitle("Play Sound (Space)")).toBeInTheDocument();
  });

  test("clicking play triggers playSound without crashing", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));
    const playBtn = screen.getByTitle("Play Sound (Space)");
    expect(() => fireEvent.click(playBtn)).not.toThrow();
  });

  test("guessing an animal shows the result", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
    });

    const choiceButtons = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("choice-button"));
    if (choiceButtons.length > 0) fireEvent.click(choiceButtons[0]);

    await waitFor(() => {
      const result =
        screen.queryByText("🎉 Correct!") ?? screen.queryByText("❌ Wrong!");
      expect(result).toBeTruthy();
    });
  });

  test("Next Round button appears after guessing", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
    });

    const choiceButtons = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("choice-button"));
    if (choiceButtons.length > 0) fireEvent.click(choiceButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Next Round")).toBeInTheDocument();
    });
  });

  test("clicking Next Round advances to round 2", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    await waitFor(() => {
      expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
    });

    const choiceButtons = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("choice-button"));
    if (choiceButtons.length > 0) fireEvent.click(choiceButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Next Round")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Next Round"));
    expect(screen.getByText("Round")).toBeInTheDocument();
  });

  test("Waveform canvas is rendered during game", () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    const canvas = document.querySelector("canvas.waveform");
    expect(canvas).toBeTruthy();
    expect(canvas?.tagName).toBe("CANVAS");
  });

  test("squirrel round overlay appears on round 7", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    for (let round = 1; round <= 6; round++) {
      await waitFor(() => {
        expect(screen.getAllByRole("button").length).toBeGreaterThan(2);
      });

      const choiceButtons = screen
        .getAllByRole("button")
        .filter((b) => b.className.includes("choice-button"));
      if (choiceButtons.length > 0) fireEvent.click(choiceButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Next Round")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Next Round"));
    }

    await waitFor(() => {
      expect(screen.getByText("🐿️ SQUIRREL ROUND 🐿️")).toBeInTheDocument();
    });
  });

  test("game over screen shows play again and change mode", async () => {
    render(<App />);
    fireEvent.click(screen.getByText("Classic"));

    for (let round = 1; round <= 10; round++) {
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        expect(buttons.length).toBeGreaterThan(2);
      });

      if (screen.queryByText("Play Again")) break;

      if (screen.queryByText("🐿️ SQUIRREL ROUND 🐿️")) {
        const choiceButtons = screen
          .getAllByRole("button")
          .filter((b) => b.className.includes("choice-button"));
        if (choiceButtons.length >= 2) {
          fireEvent.click(choiceButtons[0]);
          fireEvent.click(choiceButtons[1]);
        }
      } else {
        const choiceButtons = screen
          .getAllByRole("button")
          .filter((b) => b.className.includes("choice-button"));
        if (choiceButtons.length > 0) fireEvent.click(choiceButtons[0]);
      }

      await waitFor(() => {
        expect(screen.getByText("Next Round")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Next Round"));
    }

    await waitFor(
      () => {
        expect(screen.getByText("Play Again")).toBeInTheDocument();
        expect(screen.getByText("Change Mode")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });
});
