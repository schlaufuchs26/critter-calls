import { describe, expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/react";
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
    // After starting, we should see the play button
    expect(screen.getByTitle("Play Sound (Space)")).toBeInTheDocument();
  });
});
