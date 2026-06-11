import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// Fix Happy DOM missing PropertySymbol.dispatchError
const dispatchErrorSym = Symbol.for("dispatchError");
if (!(dispatchErrorSym in window)) {
  // biome-ignore lint/suspicious/noExplicitAny: Happy DOM internal symbol
  (window as any)[dispatchErrorSym] = (err: Error) => {
    console.error("dispatchError:", err.message);
  };
}

// Mock AudioContext
if (!globalThis.AudioContext) {
  class MockAnalyserNode {
    frequencyBinCount = 128;
    fftSize = 256;
    smoothingTimeConstant = 0.7;
    connect() {}
    disconnect() {}
    getByteFrequencyData(_array: Uint8Array) {}
  }
  class MockAudioContext {
    state = "running";
    createAnalyser() {
      return new MockAnalyserNode();
    }
    createMediaElementSource() {
      return { connect() {}, disconnect() {} };
    }
    resume() {
      return Promise.resolve();
    }
    get destination() {
      return {};
    }
  }
  // biome-ignore lint/suspicious/noExplicitAny: mocking browser API
  (globalThis as any).AudioContext = MockAudioContext;
}

// Mock Audio element
if (!globalThis.Audio) {
  // biome-ignore lint/suspicious/noExplicitAny: mocking browser API
  (globalThis as any).Audio = class {
    src = "";
    ended = false;
    paused = true;
    currentTime = 0;
    onended: (() => void) | null = null;
    onerror: (() => void) | null = null;
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    addEventListener(_type: string, _fn: () => void) {}
  };
}
