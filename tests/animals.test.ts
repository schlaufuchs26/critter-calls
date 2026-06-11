import { describe, expect, test } from "bun:test";
import {
  getDailyAnimals,
  getDailyChoices,
  getTodaysDateString,
  getTodaysSeed,
} from "../src/animals";

describe("animals utility functions", () => {
  test("getTodaysSeed returns a date-based integer", () => {
    const seed = getTodaysSeed();
    expect(seed).toBeGreaterThan(20260000);
    expect(Number.isInteger(seed)).toBe(true);
  });

  test("getTodaysDateString returns a formatted date", () => {
    const str = getTodaysDateString();
    expect(typeof str).toBe("string");
    expect(str.length).toBeGreaterThan(10);
  });

  test("getDailyAnimals returns exactly 5 animals", () => {
    const animals = getDailyAnimals();
    expect(animals).toHaveLength(5);
    // Same seed = same result
    const again = getDailyAnimals();
    expect(again.map((a) => a.name)).toEqual(animals.map((a) => a.name));
  });

  test("getDailyAnimals returns valid animal objects", () => {
    const animals = getDailyAnimals();
    for (const a of animals) {
      expect(a.name).toBeTruthy();
      expect(a.emoji).toBeTruthy();
      expect(a.soundUrl).toBeTruthy();
    }
  });

  test("getDailyChoices returns 1 correct + 3 incorrect = 4 total", () => {
    const daily = getDailyAnimals();
    const correct = daily[0];
    const choices = getDailyChoices(correct, getTodaysSeed(), 0);
    expect(choices).toHaveLength(4);
    expect(choices.some((c) => c.name === correct.name)).toBe(true);
  });

  test("getDailyChoices is deterministic for same inputs", () => {
    const daily = getDailyAnimals();
    const correct = daily[0];
    const seed = 20260611;
    const a = getDailyChoices(correct, seed, 1);
    const b = getDailyChoices(correct, seed, 1);
    expect(a.map((c) => c.name)).toEqual(b.map((c) => c.name));
  });

  test("getDailyChoices changes with different round index", () => {
    const daily = getDailyAnimals();
    const correct = daily[0];
    const seed = getTodaysSeed();
    const round0 = getDailyChoices(correct, seed, 0);
    const round1 = getDailyChoices(correct, seed, 1);
    // Ordering should differ due to different rng stream
    expect(round0.map((c) => c.name)).not.toEqual(round1.map((c) => c.name));
  });
});
