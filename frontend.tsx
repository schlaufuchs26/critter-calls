import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { type Animal, getTodaysDateString } from "./src/animals";
import { type GameMode, type GameState, SoundGuessrGame } from "./src/game";
import "./src/style.css";

function useGame() {
  const [game] = useState(() => new SoundGuessrGame("classic"));
  const [state, setState] = useState<GameState>(game.getState());
  const [mode, setMode] = useState<GameMode>("classic");
  const [showSquirrelIntro, setShowSquirrelIntro] = useState(false);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    setState({ ...game.getState() });
  }, [game]);

  const clearCheckInterval = useCallback(() => {
    if (checkInterval.current) {
      clearInterval(checkInterval.current);
      checkInterval.current = null;
    }
  }, []);

  const startGame = useCallback(
    (m: GameMode) => {
      setMode(m);
      const g = game;
      g.startGame(m);
      refresh();
    },
    [game, refresh],
  );

  const playSound = useCallback(async () => {
    try {
      await game.playSound();
      refresh();
      checkInterval.current = setInterval(() => {
        if (!game.getState().isPlaying) {
          clearCheckInterval();
          refresh();
        }
      }, 100);
    } catch (e) {
      console.error("Error playing sound:", e);
    }
  }, [game, refresh, clearCheckInterval]);

  const stopSound = useCallback(() => {
    clearCheckInterval();
    game.stopSound();
    refresh();
  }, [game, refresh, clearCheckInterval]);

  const makeGuess = useCallback(
    (animal: Animal) => {
      game.makeGuess(animal);
      const s = game.getState();
      if (s.showAnswer) {
        clearCheckInterval();
        game.stopSound();
      }
      refresh();
    },
    [game, refresh, clearCheckInterval],
  );

  const nextRound = useCallback(() => {
    clearCheckInterval();
    game.stopSound();
    const wasSquirrel = game.getState().isSquirrelRound;
    game.nextRound();
    const isSquirrel = game.getState().isSquirrelRound;
    refresh();
    if (isSquirrel && !wasSquirrel) {
      setShowSquirrelIntro(true);
      setTimeout(() => setShowSquirrelIntro(false), 2000);
    }
  }, [game, refresh, clearCheckInterval]);

  const goToMenu = useCallback(() => {
    clearCheckInterval();
    game.stopSound();
    setMode("classic");
  }, [game, clearCheckInterval]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = game.getState();
      const target = e.target as HTMLElement | null;
      const isInteractive =
        !!target &&
        (target.closest("button, a, input, textarea, select") !== null ||
          target.isContentEditable);

      if (!s.showAnswer && !s.gameOver && !isInteractive) {
        if (["1", "2", "3", "4"].includes(e.key)) {
          const index = Number(e.key) - 1;
          if (s.choices[index]) makeGuess(s.choices[index]);
        }
        if (e.code === "Space") {
          e.preventDefault();
          s.isPlaying ? stopSound() : playSound();
        }
      }
      if (e.code === "Enter" && s.showAnswer && !s.gameOver) {
        nextRound();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [game, makeGuess, playSound, stopSound, nextRound]);

  return {
    state,
    mode,
    showSquirrelIntro,
    startGame,
    playSound,
    stopSound,
    makeGuess,
    nextRound,
    goToMenu,
    getProgress: () => game.getProgress(),
  };
}

// --- Components ---

function ModeSelect({ onSelect }: { onSelect: (mode: GameMode) => void }) {
  const dateStr = getTodaysDateString();
  return (
    <div className="game-container">
      <div className="header">
        <h1 className="title">🔊 Critter Calls</h1>
        <p className="subtitle">Guess the animal from its sound!</p>
      </div>
      <div className="mode-select">
        <button
          type="button"
          className="mode-button classic-button"
          onClick={() => onSelect("classic")}
        >
          <span className="mode-emoji">🎲</span>
          <span className="mode-title">Classic</span>
          <span className="mode-desc">
            10 random rounds with Squirrel Rounds
          </span>
        </button>
        <button
          type="button"
          className="mode-button daily-button"
          onClick={() => onSelect("daily")}
        >
          <span className="mode-emoji">📅</span>
          <span className="mode-title">Daily Challenge</span>
          <span className="mode-desc">
            {dateStr}
            <br />5 rounds · same for everyone today
          </span>
        </button>
      </div>
    </div>
  );
}

function GameScreen({
  state,
  mode,
  showSquirrelIntro,
  onPlay,
  onStop,
  onGuess,
  onNext,
  onMenu,
  progress,
}: {
  state: GameState;
  mode: GameMode;
  showSquirrelIntro: boolean;
  onPlay: () => void;
  onStop: () => void;
  onGuess: (animal: Animal) => void;
  onNext: () => void;
  onMenu: () => void;
  progress: number;
}) {
  return (
    <>
      {showSquirrelIntro && (
        <div className="squirrel-overlay show">
          <span className="emoji">🐿️🐿️🐿️</span>
          <h2>SQUIRREL ROUND!</h2>
          <p>Listen for TWO animals at once!</p>
        </div>
      )}
      <div
        className={`game-container ${state.isSquirrelRound ? "squirrel-mode-active" : ""}`}
      >
        <Header state={state} mode={mode} progress={progress} />
        <GameArea
          state={state}
          onPlay={onPlay}
          onStop={onStop}
          onGuess={onGuess}
          onNext={onNext}
          onMenu={onMenu}
        />
      </div>
    </>
  );
}

function Header({
  state,
  mode,
  progress,
}: {
  state: GameState;
  mode: GameMode;
  progress: number;
}) {
  const subtitle =
    mode === "daily"
      ? `📅 Daily Challenge — ${getTodaysDateString()}`
      : "Guess the animal from its sound!";

  return (
    <>
      <div className="header">
        <h1 className="title">🔊 Critter Calls</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="stats">
        <div className="stat">
          <div className="stat-value">
            {state.currentRound}/{state.totalRounds}
          </div>
          <div className="stat-label">Round</div>
        </div>
        <div className="stat">
          <div className="stat-value">
            {state.score} / {state.maxPossibleScore}
          </div>
          <div className="stat-label">Score</div>
        </div>
        <div className="stat">
          <div className="stat-value">{state.streak}</div>
          <div className="stat-label">Streak</div>
        </div>
      </div>
    </>
  );
}

function GameArea({
  state,
  onPlay,
  onStop,
  onGuess,
  onNext,
  onMenu,
}: {
  state: GameState;
  onPlay: () => void;
  onStop: () => void;
  onGuess: (animal: Animal) => void;
  onNext: () => void;
  onMenu: () => void;
}) {
  if (state.gameOver) {
    return <GameOverScreen state={state} onRestart={onNext} onMenu={onMenu} />;
  }

  return (
    <div className="game-area">
      <SoundSection state={state} onPlay={onPlay} onStop={onStop} />
      {state.showAnswer ? (
        <ResultSection state={state} onNext={onNext} />
      ) : (
        <ChoicesSection state={state} onGuess={onGuess} />
      )}
    </div>
  );
}

function SoundSection({
  state,
  onPlay,
  onStop,
}: {
  state: GameState;
  onPlay: () => void;
  onStop: () => void;
}) {
  const question = state.isSquirrelRound
    ? "Which TWO animals do you hear?"
    : "What animal makes this sound?";

  return (
    <div className="sound-section">
      {state.isSquirrelRound && (
        <div className="difficulty-badge hard">
          <span className="squirrel-alert">🐿️ SQUIRREL ROUND 🐿️</span>
        </div>
      )}
      <h2 className="sound-question">{question}</h2>
      <div className="sound-controls">
        <button
          type="button"
          className="play-button"
          onClick={() => (state.isPlaying ? onStop() : onPlay())}
          title="Play Sound (Space)"
        >
          {state.isPlaying ? "⏸️" : "▶️"}
        </button>
        <div className={`waveform ${state.isPlaying ? "playing" : ""}`}>
          <span>
            {state.isPlaying ? "🎵 Playing..." : "🔊 Click to play sound"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ChoicesSection({
  state,
  onGuess,
}: {
  state: GameState;
  onGuess: (animal: Animal) => void;
}) {
  return (
    <div className="choices">
      {state.choices.map((animal, i) => {
        const isSelected =
          state.isSquirrelRound &&
          state.selectedSquirrelChoices.some((c) => c.name === animal.name);
        return (
          <button
            type="button"
            key={animal.name}
            className={`choice-button ${isSelected ? "selected" : ""}`}
            onClick={() => onGuess(animal)}
          >
            <span className="key-hint">{i + 1}</span>
            <span className="animal-emoji">{animal.emoji}</span>
            <span>{animal.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function ResultSection({
  state,
  onNext,
}: {
  state: GameState;
  onNext: () => void;
}) {
  const correct = state.isSquirrelRound
    ? state.squirrelAnimals.every((a) =>
        state.selectedSquirrelChoices.some((c) => c.name === a.name),
      )
    : state.selectedChoice?.name === state.currentAnimal?.name;

  return (
    <div className="result-section" style={{ display: "block" }}>
      <div className={`result-message ${correct ? "correct" : "incorrect"}`}>
        {correct ? "🎉 Correct!" : "❌ Wrong!"}
      </div>
      <div className="answer-display">
        {state.isSquirrelRound
          ? state.squirrelAnimals.map((a) => (
              <div key={a.name} style={{ marginBottom: 10 }}>
                <span className="answer-emoji">{a.emoji}</span>
                <div className="answer-name">{a.name}</div>
              </div>
            ))
          : state.currentAnimal && (
              <>
                <span className="answer-emoji">
                  {state.currentAnimal.emoji}
                </span>
                <div className="answer-name">{state.currentAnimal.name}</div>
                <a
                  className="source-link"
                  href={state.currentAnimal.sourceUrl}
                  target="_blank"
                  rel="noopener"
                >
                  🔗 Sound source
                </a>
              </>
            )}
      </div>
      <button
        type="button"
        className="next-button"
        onClick={onNext}
        title="Next Round (Enter)"
      >
        Next Round
      </button>
    </div>
  );
}

function GameOverScreen({
  state,
  onRestart,
  onMenu,
}: {
  state: GameState;
  onRestart: () => void;
  onMenu: () => void;
}) {
  const correct = state.roundHistory.filter((r) => r.correct).length;
  const accuracy = Math.round((correct / state.totalRounds) * 100);
  const bestStreak = Math.max(
    0,
    ...state.roundHistory.map((_, i) => {
      let streak = 0;
      for (
        let j = i;
        j < state.roundHistory.length && state.roundHistory[j].correct;
        j++
      )
        streak++;
      return streak;
    }),
  );

  return (
    <div className="game-over" style={{ display: "block" }}>
      <h2>🎉 Game Complete!</h2>
      <div className="final-score">{state.score}</div>
      <div className="score-breakdown">
        <h3>Final Stats</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1rem",
            marginTop: "1rem",
          }}
        >
          <div className="stat">
            <div className="stat-value">{accuracy}%</div>
            <div className="stat-label">Accuracy</div>
          </div>
          <div className="stat">
            <div className="stat-value">
              {correct}/{state.totalRounds}
            </div>
            <div className="stat-label">Correct</div>
          </div>
          <div className="stat">
            <div className="stat-value">{bestStreak}</div>
            <div className="stat-label">Best Streak</div>
          </div>
        </div>
      </div>
      <button type="button" className="restart-button" onClick={onRestart}>
        Play Again
      </button>
      <button
        type="button"
        className="restart-button"
        onClick={onMenu}
        style={{ background: "var(--primary-color)", marginTop: "0.5rem" }}
      >
        Change Mode
      </button>
    </div>
  );
}

// --- App ---

export function App() {
  const {
    state,
    mode,
    showSquirrelIntro,
    startGame,
    playSound,
    stopSound,
    makeGuess,
    nextRound,
    goToMenu,
    getProgress,
  } = useGame();

  if (mode === "classic" && state.currentRound === 0) {
    return <ModeSelect onSelect={startGame} />;
  }

  return (
    <GameScreen
      state={state}
      mode={mode}
      showSquirrelIntro={showSquirrelIntro}
      onPlay={playSound}
      onStop={stopSound}
      onGuess={makeGuess}
      onNext={nextRound}
      onMenu={goToMenu}
      progress={getProgress()}
    />
  );
}

const el = document.getElementById("root");
if (el) {
  const root = createRoot(el);
  root.render(<App />);
}
