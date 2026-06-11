import {
  type Animal,
  animals,
  generateChoices,
  getDailyAnimals,
  getDailyChoices,
  getRandomAnimals,
  getTodaysSeed,
} from "./animals";

export type GameMode = "classic" | "daily";

export interface GameState {
  currentRound: number;
  totalRounds: number;
  score: number;
  streak: number;
  currentAnimal: Animal | null;
  choices: Animal[];
  isPlaying: boolean;
  gameOver: boolean;
  selectedChoice: Animal | null;
  showAnswer: boolean;
  correctAnswers: number;
  roundHistory: RoundResult[];
  isSquirrelRound: boolean;
  squirrelAnimals: Animal[];
  selectedSquirrelChoices: Animal[];
  maxPossibleScore: number;
  mode: GameMode;
}

interface RoundResult {
  animal: Animal | Animal[];
  selectedChoice: Animal | Animal[];
  correct: boolean;
  points: number;
  maxPoints: number;
  isSquirrelRound: boolean;
}

export class SoundGuessrGame {
  private state: GameState;
  private gameAnimals: Animal[];
  private audioElements: HTMLAudioElement[] = [];
  private mode: GameMode;
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNodes: MediaElementAudioSourceNode[] = [];

  constructor(mode: GameMode = "classic") {
    this.mode = mode;
    this.state = this.getInitialState();
    this.gameAnimals = this.generateGamePlaylist();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.7;
      this.analyserNode.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private getInitialState(): GameState {
    return {
      currentRound: 0,
      totalRounds: this.mode === "daily" ? 5 : 10,
      score: 0,
      streak: 0,
      currentAnimal: null,
      choices: [],
      isPlaying: false,
      gameOver: false,
      selectedChoice: null,
      showAnswer: false,
      correctAnswers: 0,
      roundHistory: [],
      isSquirrelRound: false,
      squirrelAnimals: [],
      selectedSquirrelChoices: [],
      maxPossibleScore: 0,
      mode: this.mode,
    };
  }

  private generateGamePlaylist(): Animal[] {
    if (this.mode === "daily") {
      return getDailyAnimals();
    }
    return getRandomAnimals(10);
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public startGame(mode?: GameMode): void {
    if (mode !== undefined) this.mode = mode;
    this.state = this.getInitialState();
    this.gameAnimals = this.generateGamePlaylist();
    this.nextRound();
  }

  public resetToMenu(): void {
    this.mode = "classic";
    this.state = this.getInitialState();
  }

  public nextRound(): void {
    if (this.state.currentRound >= this.state.totalRounds) {
      this.endGame();
      return;
    }

    this.state.currentRound++;

    // Check if it's squirrel round (Round 7 and Round 10) — classic mode only
    this.state.isSquirrelRound =
      this.mode === "classic" &&
      (this.state.currentRound === 7 || this.state.currentRound === 10);

    if (this.state.isSquirrelRound) {
      this.state.squirrelAnimals = getRandomAnimals(2); // 2 animals at once
      this.state.currentAnimal = null;

      // Choices include both correct ones and 2 random ones
      const others = animals.filter(
        (a) => !this.state.squirrelAnimals.find((s) => s.name === a.name),
      );
      const randomOthers = others.sort(() => 0.5 - Math.random()).slice(0, 2);
      this.state.choices = [
        ...this.state.squirrelAnimals,
        ...randomOthers,
      ].sort(() => 0.5 - Math.random());
      this.state.selectedSquirrelChoices = [];
    } else {
      this.state.currentAnimal = this.gameAnimals[this.state.currentRound - 1];
      this.state.choices =
        this.mode === "daily"
          ? getDailyChoices(
              this.state.currentAnimal,
              getTodaysSeed(),
              this.state.currentRound,
            )
          : generateChoices(this.state.currentAnimal, animals);
      this.state.squirrelAnimals = [];
    }

    this.state.selectedChoice = null;
    this.state.showAnswer = false;

    this.stopSound();
  }

  public async playSound(): Promise<void> {
    const targets = this.state.isSquirrelRound
      ? this.state.squirrelAnimals
      : this.state.currentAnimal
        ? [this.state.currentAnimal]
        : [];
    if (targets.length === 0) return;

    try {
      this.stopSound();
      this.state.isPlaying = true;

      const ctx = this.getAudioContext();
      const analyser = this.analyserNode;
      if (!analyser) return;

      const playPromises = targets.map((animal) => {
        const audio = new Audio(animal.soundUrl);
        this.audioElements.push(audio);

        const source = ctx.createMediaElementSource(audio);
        source.connect(analyser);
        this.sourceNodes.push(source);

        audio.addEventListener("ended", () => {
          if (this.audioElements.every((a) => a.ended || a.paused)) {
            this.state.isPlaying = false;
          }
        });

        audio.addEventListener("error", (e) => {
          console.error("Error playing audio:", e);
          this.state.isPlaying = false;
        });

        return audio.play();
      });

      await Promise.all(playPromises);
    } catch (error) {
      console.error("Error playing sound:", error);
      this.state.isPlaying = false;
    }
  }

  public stopSound(): void {
    this.sourceNodes.forEach((s) => {
      try {
        s.disconnect();
      } catch (_) {}
    });
    this.sourceNodes = [];
    this.audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.audioElements = [];
    this.state.isPlaying = false;
  }

  public makeGuess(choice: Animal): void {
    if (this.state.showAnswer || this.state.gameOver) return;

    if (this.state.isSquirrelRound) {
      // Toggle choice
      const index = this.state.selectedSquirrelChoices.findIndex(
        (c) => c.name === choice.name,
      );
      if (index > -1) {
        this.state.selectedSquirrelChoices.splice(index, 1);
      } else {
        this.state.selectedSquirrelChoices.push(choice);
      }

      // If they picked 2, evaluate
      if (this.state.selectedSquirrelChoices.length === 2) {
        this.evaluateSquirrelGuess();
      }
    } else {
      this.evaluateNormalGuess(choice);
    }
  }

  private evaluateNormalGuess(choice: Animal): void {
    const isCorrect = choice.name === this.state.currentAnimal?.name;
    this.state.selectedChoice = choice;
    this.finishRound(isCorrect, this.state.currentAnimal as Animal, choice);
  }

  private evaluateSquirrelGuess(): void {
    const correctNames = this.state.squirrelAnimals.map((a) => a.name);
    const selectedNames = this.state.selectedSquirrelChoices.map((a) => a.name);
    const isCorrect = correctNames.every((name) =>
      selectedNames.includes(name),
    );

    this.finishRound(
      isCorrect,
      this.state.squirrelAnimals,
      this.state.selectedSquirrelChoices,
    );
  }

  private finishRound(
    isCorrect: boolean,
    animal: Animal | Animal[],
    choice: Animal | Animal[],
  ): void {
    this.state.showAnswer = true;

    let points = 0;
    let baseRoundPoints = 0;

    if (this.state.isSquirrelRound) {
      baseRoundPoints = 500;
    } else {
      baseRoundPoints = 200;
    }

    // Max possible score assumes perfect streak from the start
    // Streak multipliers: >=3 rounds: 1.5x, >=5 rounds: 2x
    let currentMaxRoundPoints = baseRoundPoints;
    if (this.state.currentRound >= 6) {
      // Possible to have streak of 5
      currentMaxRoundPoints *= 2;
    } else if (this.state.currentRound >= 4) {
      // Possible to have streak of 3
      currentMaxRoundPoints *= 1.5;
    }
    this.state.maxPossibleScore += Math.round(currentMaxRoundPoints);

    if (isCorrect) {
      points = baseRoundPoints;
      // Streak bonus
      if (this.state.streak >= 5) {
        points = Math.round(points * 2);
      } else if (this.state.streak >= 3) {
        points = Math.round(points * 1.5);
      }

      this.state.score += points;
      this.state.correctAnswers++;
      this.state.streak++;
    } else {
      this.state.streak = 0;
    }

    this.state.roundHistory.push({
      animal,
      selectedChoice: choice,
      correct: isCorrect,
      points,
      maxPoints: Math.round(currentMaxRoundPoints),
      isSquirrelRound: this.state.isSquirrelRound,
    });

    this.stopSound();
  }

  private endGame(): void {
    this.state.gameOver = true;
    this.stopSound();
  }

  public getProgress(): number {
    return (this.state.currentRound / this.state.totalRounds) * 100;
  }

  public getFinalStats() {
    const accuracy = (this.state.correctAnswers / this.state.totalRounds) * 100;

    return {
      totalScore: this.state.score,
      accuracy: Math.round(accuracy),
      correctAnswers: this.state.correctAnswers,
      totalRounds: this.state.totalRounds,
      bestStreak: Math.max(
        0,
        ...this.state.roundHistory.map((_, i) => {
          let streak = 0;
          for (
            let j = i;
            j < this.state.roundHistory.length &&
            this.state.roundHistory[j].correct;
            j++
          ) {
            streak++;
          }
          return streak;
        }),
      ),
    };
  }
}
