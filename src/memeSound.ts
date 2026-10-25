import { getMemeVolume } from "./uiSound";

export const BONK_SRC = "/default-memes/bonk.mp3";
export const SPLASH_SRC = "/default-memes/splash.mp3";
export const MEME_FADE_MS = 400;

export type Playing = {
  fade: (ms: number) => void;
  stop: () => void;
  done: Promise<void>;
};

/** Plays a file at the saved meme volume. `fade` turns it down from there; `stop` cuts it. */
export function playFile(src: string): Playing {
  const audio = new Audio(src);
  audio.volume = getMemeVolume();
  let settled = false;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
  });
  audio.onended = () => resolveDone();
  audio.play().catch(() => resolveDone());
  return {
    fade(ms) {
      const start = audio.volume;
      const began = performance.now();
      const step = () => {
        const passed = Math.min(1, (performance.now() - began) / ms);
        audio.volume = start * (1 - passed);
        if (passed < 1 && !audio.paused) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    stop() {
      audio.onended = null;
      audio.pause();
      resolveDone();
    },
    done,
  };
}

/** A short original sting for a picture that has no sound of its own. */
export function playSting(): Playing {
  const ctx = new AudioContext();
  void ctx.resume();
  const master = ctx.createGain();
  master.gain.value = Math.max(getMemeVolume(), 0.0001);
  master.connect(ctx.destination);
  const now = ctx.currentTime;
  const notes = [392, 494, 587, 784];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = now + i * 0.16;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.45, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.22);
  });
  let settled = false;
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
  });
  const timer = window.setTimeout(() => {
    ctx.close().catch(() => {});
    resolveDone();
  }, notes.length * 160 + 80);
  return {
    fade(ms) {
      const at = ctx.currentTime;
      master.gain.cancelScheduledValues(at);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), at);
      master.gain.linearRampToValueAtTime(0.0001, at + ms / 1000);
    },
    stop() {
      clearTimeout(timer);
      ctx.close().catch(() => {});
      resolveDone();
    },
    done,
  };
}
