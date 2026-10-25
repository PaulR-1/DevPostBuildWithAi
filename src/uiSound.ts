/** Interface tones. Separate from meme volume so a loud bonk does not force the clicks loud too. */

let memeVolume = 1;
let ambientVolume = 1;
let audio: AudioContext | null = null;

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

export function getMemeVolume(): number {
  return memeVolume;
}

export function getAmbientVolume(): number {
  return ambientVolume;
}

export function setMemeVolume(value: number) {
  memeVolume = clampVolume(value);
}

export function setAmbientVolume(value: number) {
  ambientVolume = clampVolume(value);
}

function context(): AudioContext {
  audio ??= new AudioContext();
  void audio.resume();
  return audio;
}

function blip(freq: number, duration: number, peak: number, type: OscillatorType) {
  if (ambientVolume <= 0) return;
  const ctx = context();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const now = ctx.currentTime;
  const level = Math.max(0.0002, peak * ambientVolume);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(level, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function phrase(notes: number[]) {
  if (ambientVolume <= 0) return;
  const ctx = context();
  const now = ctx.currentTime;
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = now + i * 0.12;
    const level = Math.max(0.0002, 0.18 * ambientVolume);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.2);
  });
}

/** The original soft tick. */
export function playClick() {
  blip(880, 0.04, 0.12, "sine");
}

/** A water drop for closing, deleting, and cancelling. */
export function playDrop() {
  if (ambientVolume <= 0) return;
  const ctx = context();
  const now = ctx.currentTime;
  const level = Math.max(0.0002, 0.22 * ambientVolume);

  const tone = ctx.createOscillator();
  const toneGain = ctx.createGain();
  tone.type = "sine";
  tone.frequency.value = 880;
  toneGain.gain.setValueAtTime(0.0001, now);
  toneGain.gain.exponentialRampToValueAtTime(level, now + 0.008);
  toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
  tone.connect(toneGain);
  toneGain.connect(ctx.destination);
  tone.start(now);
  tone.stop(now + 0.07);

  const drop = ctx.createOscillator();
  const dropGain = ctx.createGain();
  drop.type = "sine";
  drop.frequency.setValueAtTime(1480, now);
  drop.frequency.exponentialRampToValueAtTime(620, now + 0.06);
  dropGain.gain.setValueAtTime(0.0001, now);
  dropGain.gain.exponentialRampToValueAtTime(level * 0.5, now + 0.006);
  dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  drop.connect(dropGain);
  dropGain.connect(ctx.destination);
  drop.start(now);
  drop.stop(now + 0.08);

  const frames = Math.floor(ctx.sampleRate * 0.04);
  const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const splash = ctx.createBufferSource();
  splash.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400;
  filter.Q.value = 0.7;
  const splashGain = ctx.createGain();
  splashGain.gain.setValueAtTime(level * 0.35, now);
  splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
  splash.connect(filter);
  filter.connect(splashGain);
  splashGain.connect(ctx.destination);
  splash.start(now);
  splash.stop(now + 0.04);
}

/** Rising ticks for 3, then 2, then 1. The last one is the highest. */
export function playCountdown(left: number) {
  const freq = left === 3 ? 440 : left === 2 ? 554 : left === 1 ? 659 : 0;
  if (!freq) return;
  blip(freq, 0.12, 0.2, "sine");
}

export function playSessionStart() {
  phrase([523, 784]);
}

export function playSessionEnd() {
  phrase([784, 392]);
}
