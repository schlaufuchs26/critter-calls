import { beforeEach, describe, expect, test } from "bun:test";
import { SoundGuessrGame } from "../src/game";

describe("SoundGuessrGame", () => {
  let game: SoundGuessrGame;

  describe("initialization", () => {
    test("creates a game in classic mode by default", () => {
      game = new SoundGuessrGame();
      const state = game.getState();
      expect(state.totalRounds).toBe(10);
      expect(state.score).toBe(0);
      expect(state.streak).toBe(0);
      expect(state.gameOver).toBe(false);
      expect(state.currentRound).toBe(0);
      expect(state.mode).toBe("classic");
    });

    test("creates a game in daily mode", () => {
      game = new SoundGuessrGame("daily");
      const state = game.getState();
      expect(state.totalRounds).toBe(5);
      expect(state.mode).toBe("daily");
    });

    test("getAnalyser returns null before any audio playback", () => {
      game = new SoundGuessrGame();
      expect(game.getAnalyser()).toBeNull();
    });

    test("getState returns a copy, not a reference", () => {
      game = new SoundGuessrGame();
      const s1 = game.getState();
      const s2 = game.getState();
      expect(s1).not.toBe(s2);
      expect(s1).toEqual(s2);
    });
  });

  describe("startGame", () => {
    test("starts a classic game and advances to round 1", () => {
      game = new SoundGuessrGame();
      game.startGame("classic");
      const state = game.getState();
      expect(state.currentRound).toBe(1);
      expect(state.gameOver).toBe(false);
      expect(state.showAnswer).toBe(false);
      expect(state.choices).toHaveLength(4);
    });

    test("switches mode when starting with a different mode", () => {
      game = new SoundGuessrGame("classic");
      game.startGame("daily");
      const state = game.getState();
      expect(state.mode).toBe("daily");
      expect(state.totalRounds).toBe(5);
    });

    test("generates a playlist of 10 animals for classic", () => {
      game = new SoundGuessrGame();
      game.startGame("classic");
      for (let i = 1; i <= 10; i++) {
        const state = game.getState();
        expect(state.choices).toHaveLength(4);
        expect(state.currentRound).toBe(i);
        if (i < 10) game.nextRound();
        if (state.gameOver) break;
      }
    });

    test("game ends after last round", () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 0; i < 10; i++) {
        const state = game.getState();
        if (state.gameOver) break;
        if (state.currentAnimal) game.makeGuess(state.currentAnimal);
        game.nextRound();
      }
      expect(game.getState().gameOver).toBe(true);
    });
  });

  describe("resetToMenu", () => {
    test("resets state to initial after a finished game", () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 0; i < 10; i++) {
        const state = game.getState();
        if (state.gameOver) break;
        if (state.currentAnimal) game.makeGuess(state.currentAnimal);
        game.nextRound();
      }
      expect(game.getState().gameOver).toBe(true);

      game.resetToMenu();
      const state = game.getState();
      expect(state.currentRound).toBe(0);
      expect(state.gameOver).toBe(false);
      expect(state.score).toBe(0);
      expect(state.mode).toBe("classic");
    });

    test("resets mode to classic even if previously daily", () => {
      game = new SoundGuessrGame();
      game.startGame("daily");
      game.resetToMenu();
      const state = game.getState();
      expect(state.mode).toBe("classic");
      expect(state.totalRounds).toBe(10);
    });
  });

  describe("makeGuess", () => {
    beforeEach(() => {
      game = new SoundGuessrGame();
      game.startGame();
    });

    test("correct guess increases score and streak", () => {
      const state = game.getState();
      const correctAnimal = state.currentAnimal;
      if (!correctAnimal) return;

      game.makeGuess(correctAnimal);
      const after = game.getState();

      expect(after.showAnswer).toBe(true);
      expect(after.selectedChoice?.name).toBe(correctAnimal.name);
      expect(after.correctAnswers).toBeGreaterThanOrEqual(1);
      expect(after.score).toBeGreaterThan(0);
      expect(after.streak).toBe(1);
    });

    test("incorrect guess resets streak", () => {
      const state = game.getState();
      const correctAnimal = state.currentAnimal;
      if (!correctAnimal) return;

      const wrongChoice = state.choices.find(
        (c) => c.name !== correctAnimal.name,
      );
      if (!wrongChoice) return;

      game.makeGuess(wrongChoice);
      const after = game.getState();

      expect(after.showAnswer).toBe(true);
      expect(after.selectedChoice?.name).toBe(wrongChoice.name);
      expect(after.streak).toBe(0);
    });

    test("streak builds up over multiple correct rounds", () => {
      for (let i = 0; i < 3; i++) {
        const state = game.getState();
        if (state.currentAnimal) game.makeGuess(state.currentAnimal);
        game.nextRound();
      }
      expect(game.getState().streak).toBeGreaterThanOrEqual(2);
    });

    test("streak bonus kicks in at streak >= 3", () => {
      for (let i = 0; i < 3; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      const s4 = game.getState();
      if (s4.currentAnimal) game.makeGuess(s4.currentAnimal);
      const after4 = game.getState();
      expect(after4.score).toBeGreaterThanOrEqual(800);
    });

    test("streak bonus at streak >= 5 gives 2x", () => {
      for (let i = 0; i < 5; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      const s6 = game.getState();
      if (s6.currentAnimal) game.makeGuess(s6.currentAnimal);
      const after6 = game.getState();
      expect(after6.score).toBeGreaterThanOrEqual(1200);
    });

    test("ignores guesses when answer is already showing", () => {
      const state = game.getState();
      const correctAnimal = state.currentAnimal;
      if (!correctAnimal) return;

      game.makeGuess(correctAnimal);
      expect(game.getState().showAnswer).toBe(true);

      const wrongChoice = game.getState().choices[0];
      game.makeGuess(wrongChoice);
      expect(game.getState().showAnswer).toBe(true);
    });

    test("squirrel round on round 7 works correctly", () => {
      for (let i = 1; i <= 6; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      const s7 = game.getState();
      expect(s7.isSquirrelRound).toBe(true);
      expect(s7.squirrelAnimals).toHaveLength(2);
      expect(s7.choices).toHaveLength(4);

      game.makeGuess(s7.squirrelAnimals[0]);
      game.makeGuess(s7.squirrelAnimals[1]);

      const after = game.getState();
      expect(after.showAnswer).toBe(true);
    });

    test("squirrel round with wrong guess shows incorrect", () => {
      for (let i = 1; i <= 6; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      const s7 = game.getState();
      expect(s7.isSquirrelRound).toBe(true);

      const wrongChoice = s7.choices.find(
        (c) =>
          c.name !== s7.squirrelAnimals[0].name &&
          c.name !== s7.squirrelAnimals[1].name,
      );
      game.makeGuess(s7.squirrelAnimals[0]);
      if (wrongChoice) game.makeGuess(wrongChoice);

      const after = game.getState();
      expect(after.showAnswer).toBe(true);
      expect(after.streak).toBe(0);
    });

    test("squirrel round on round 10 works", () => {
      for (let i = 1; i <= 9; i++) {
        const s = game.getState();
        if (s.isSquirrelRound) {
          game.makeGuess(s.squirrelAnimals[0]);
          game.makeGuess(s.squirrelAnimals[1]);
        } else if (s.currentAnimal) {
          game.makeGuess(s.currentAnimal);
        }
        game.nextRound();
      }
      const s10 = game.getState();
      expect(s10.isSquirrelRound).toBe(true);
    });
  });

  describe("nextRound", () => {
    test("advances to next round after a guess", () => {
      game = new SoundGuessrGame();
      game.startGame();
      const r1 = game.getState().currentRound;
      const animal = game.getState().currentAnimal;
      if (animal) game.makeGuess(animal);
      game.nextRound();
      expect(game.getState().currentRound).toBe(r1 + 1);
      expect(game.getState().showAnswer).toBe(false);
      expect(game.getState().selectedChoice).toBeNull();
    });

    test("ends game when all rounds complete", () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 0; i < 10; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
        if (s.gameOver) break;
      }
      expect(game.getState().gameOver).toBe(true);
    });
  });

  describe("getProgress", () => {
    test("returns 0% at round 0", () => {
      game = new SoundGuessrGame();
      expect(game.getProgress()).toBe(0);
    });

    test("returns correct percentage mid-game", () => {
      game = new SoundGuessrGame();
      game.startGame();
      expect(game.getProgress()).toBe(10);
    });
  });

  describe("getFinalStats", () => {
    test("returns stats object with expected keys", () => {
      game = new SoundGuessrGame();
      const stats = game.getFinalStats();
      expect(stats).toHaveProperty("totalScore");
      expect(stats).toHaveProperty("accuracy");
      expect(stats).toHaveProperty("correctAnswers");
      expect(stats).toHaveProperty("totalRounds");
      expect(stats).toHaveProperty("bestStreak");
    });

    test("bestStreak reflects longest correct run", () => {
      game = new SoundGuessrGame();
      game.startGame();
      const pattern = [true, true, false, true, true, true];
      for (let i = 0; i < pattern.length; i++) {
        const s = game.getState();
        if (s.gameOver) break;
        const target = pattern[i]
          ? s.currentAnimal
          : s.choices.find((c) => c.name !== s.currentAnimal?.name);
        if (target) game.makeGuess(target);
        game.nextRound();
      }
      const stats = game.getFinalStats();
      expect(stats.bestStreak).toBe(3);
    });

    test("bestStreak is 0 with no correct answers", () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 0; i < 10; i++) {
        const s = game.getState();
        if (s.gameOver) break;
        const wrong = s.choices.find((c) => c.name !== s.currentAnimal?.name);
        if (wrong) game.makeGuess(wrong);
        game.nextRound();
      }
      expect(game.getFinalStats().bestStreak).toBe(0);
    });
  });

  describe("stopSound", () => {
    test("stopSound is called during nextRound without errors", () => {
      game = new SoundGuessrGame();
      game.startGame();
      expect(() => game.nextRound()).not.toThrow();
    });

    test("stopSound is called during game end without errors", () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 0; i < 10; i++) {
        const s = game.getState();
        if (s.gameOver) break;
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      expect(game.getState().gameOver).toBe(true);
    });
  });

  describe("playSound", () => {
    test("playSound sets isPlaying to true", async () => {
      game = new SoundGuessrGame();
      game.startGame();
      await game.playSound();
      expect(game.getState().isPlaying).toBe(true);
    });

    test("playSound creates an analyser node", async () => {
      game = new SoundGuessrGame();
      game.startGame();
      await game.playSound();
      expect(game.getAnalyser()).toBeTruthy();
    });

    test("stopSound after playSound sets isPlaying to false", async () => {
      game = new SoundGuessrGame();
      game.startGame();
      await game.playSound();
      game.stopSound();
      expect(game.getState().isPlaying).toBe(false);
    });

    test("playSound for squirrel round plays two animals", async () => {
      game = new SoundGuessrGame();
      game.startGame();
      for (let i = 1; i <= 6; i++) {
        const s = game.getState();
        if (s.currentAnimal) game.makeGuess(s.currentAnimal);
        game.nextRound();
      }
      expect(game.getState().isSquirrelRound).toBe(true);
      await game.playSound();
      expect(game.getState().isPlaying).toBe(true);
    });
  });
});
