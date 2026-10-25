export type Angle = { yaw: number; pitch: number };

export type FocusReading = Angle & {
  faceVisible: boolean;
  bodyVisible: boolean;
  /** Wrist or index finger inside the last face square. Only used when the face mesh is missing. */
  handOverFace: boolean;
};

export type FocusState = "on-work" | "drifting" | "left-work" | "face-hidden" | "left-chair";

export type Focus = {
  /** 0 = fully green, 1 = fully red. */
  redness: number;
  /** How long the face and body have both been missing without a break. */
  missingSeconds: number;
  /** Face covered by a hand while the shoulders stay. The border holds. */
  faceHidden: boolean;
  /** The meme already bonked for this look-away; cleared once the border is fully green again. */
  bonked: boolean;
  distractions: number;
  /** The meme is on screen. A flicker cannot turn this back on until `memeGap` runs out. */
  memeVisible: boolean;
  /** Seconds left before the meme may appear again. Counts down from the moment it appears. */
  memeGap: number;
  /** Which saved spot the border is coloring. Stays put while you drift, so red grows out of that color. */
  activeIndex: number;
  /** The haze on screen, already eased toward the spot color mixed with red. */
  border: Rgb;
};

/** 0–255 channels. Kept as floats so the border can ease. */
export type Rgb = { r: number; g: number; b: number };

export const FOCUS_SETTINGS = {
  /** Degrees left/right of the safe angle that still count as on the work. */
  yawTolerance: 15,
  /** Degrees up/down of the safe angle that still count as on the work. */
  pitchTolerance: 12,
  /** Seconds of looking away to go from fully green to fully red. 25% faster than the earlier 8 seconds, so the Bonk count arrives sooner. */
  secondsToRedLookingAway: 6.4,
  /** Seconds of redness after the grace when you have left the chair. With the grace, full red is about 3.3 seconds: 50% faster than the earlier 5. */
  secondsToRedLeftChair: 3.5 / 1.5,
  /** Seconds of looking back to go from fully red to fully green. Same 25% speedup as a look-away: 3 seconds became 2.4. */
  secondsToGreen: 2.4,
  /** Face and body missing for less than this is a tracking blip, not leaving the chair. Scaled with the faster leave-the-screen timer. */
  leftChairGraceSeconds: 1,
  /** How much each new frame moves the smoothed angle (0 to 1). */
  smoothing: 0.25,
  /** After the meme appears, it cannot appear again until this many seconds have passed. */
  memeGapSeconds: 3,
  /** A spot switch is mostly finished in this many seconds. */
  colorFadeSeconds: 0.6,
};

export const MAX_SAVED_ANGLES = 3;

function hsl(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** First saved spot, second, third. Mixed with red as a look-away gets worse. */
export const SAFE_COLORS: readonly Rgb[] = [hsl(130, 0.92, 0.52), hsl(220, 0.92, 0.52), hsl(280, 0.92, 0.52)];
export const BORDER_RED: Rgb = hsl(0, 0.92, 0.52);

export const START_FOCUS: Focus = {
  redness: 0,
  missingSeconds: 0,
  faceHidden: false,
  bonked: false,
  distractions: 0,
  memeVisible: false,
  memeGap: 0,
  activeIndex: 0,
  border: SAFE_COLORS[0],
};

export function averageAngle(angles: Angle[]): Angle {
  const n = angles.length || 1;
  return {
    yaw: angles.reduce((sum, a) => sum + a.yaw, 0) / n,
    pitch: angles.reduce((sum, a) => sum + a.pitch, 0) / n,
  };
}

export function smoothAngle(prev: Angle | null, next: Angle): Angle {
  if (!prev) return next;
  const k = FOCUS_SETTINGS.smoothing;
  return { yaw: prev.yaw + (next.yaw - prev.yaw) * k, pitch: prev.pitch + (next.pitch - prev.pitch) * k };
}

export function isOnAngle(angle: Angle, safe: Angle): boolean {
  return (
    Math.abs(angle.yaw - safe.yaw) <= FOCUS_SETTINGS.yawTolerance &&
    Math.abs(angle.pitch - safe.pitch) <= FOCUS_SETTINGS.pitchTolerance
  );
}

/** The saved spot you are inside, preferring the closest when two overlap. */
export function matchedAngleIndex(angle: Angle, safes: Angle[]): number | null {
  let best: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < safes.length; i++) {
    const spot = safes[i];
    if (!isOnAngle(angle, spot)) continue;
    const dist =
      ((angle.yaw - spot.yaw) / FOCUS_SETTINGS.yawTolerance) ** 2 +
      ((angle.pitch - spot.pitch) / FOCUS_SETTINGS.pitchTolerance) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function isAngle(value: unknown): value is Angle {
  if (!value || typeof value !== "object") return false;
  const angle = value as Angle;
  return Number.isFinite(angle.yaw) && Number.isFinite(angle.pitch);
}

/** IndexedDB may hold one angle from before lists existed. */
export function anglesFromStored(value: unknown): Angle[] {
  if (Array.isArray(value)) return value.filter(isAngle).slice(0, MAX_SAVED_ANGLES);
  if (isAngle(value)) return [value];
  return [];
}

/** The first saved angle, when a caller still wants one. */
export function angleFromStored(value: unknown): Angle | null {
  return anglesFromStored(value)[0] ?? null;
}

function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return { r: from.r + (to.r - from.r) * t, g: from.g + (to.g - from.g) * t, b: from.b + (to.b - from.b) * t };
}

function easeRgb(from: Rgb, to: Rgb, seconds: number): Rgb {
  const tau = FOCUS_SETTINGS.colorFadeSeconds / 3;
  return mixRgb(from, to, 1 - Math.exp(-seconds / tau));
}

function safeColor(index: number): Rgb {
  return SAFE_COLORS[Math.min(SAFE_COLORS.length - 1, Math.max(0, index))];
}

function channel(n: number): number {
  return Math.round(Math.min(255, Math.max(0, n)));
}

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}, ${alpha})`;
}

/** Haze plus a lighter edge, in the eased color. */
export function borderShadow(color: Rgb): string {
  const edge = mixRgb(color, { r: 255, g: 255, b: 255 }, 0.35);
  return `inset 0 0 160px 56px ${rgba(color, 0.42)}, inset 0 0 0 1px ${rgba(edge, 0.55)}`;
}

/** Moves the focus forward by one frame lasting `seconds`. Any spot in `safes` counts as on the work. */
export function stepFocus(focus: Focus, reading: FocusReading, safes: Angle[], seconds: number): Focus {
  const handOverFace = !reading.faceVisible && reading.bodyVisible && reading.handOverFace;
  const lookingDown = !reading.faceVisible && reading.bodyVisible && !reading.handOverFace;
  const gone = !reading.faceVisible && !reading.bodyVisible;
  const missingSeconds = gone ? focus.missingSeconds + seconds : 0;

  let activeIndex = safes.length > 0 ? Math.min(focus.activeIndex, safes.length - 1) : focus.activeIndex;
  let onAngle = false;
  if (reading.faceVisible && safes.length > 0) {
    const matched = matchedAngleIndex(reading, safes);
    if (matched !== null) {
      activeIndex = matched;
      onAngle = true;
    }
  }

  let rate: number;
  if (handOverFace) rate = 0;
  else if (gone) {
    rate = missingSeconds < FOCUS_SETTINGS.leftChairGraceSeconds ? 0 : 1 / FOCUS_SETTINGS.secondsToRedLeftChair;
  } else if (lookingDown || !onAngle) rate = 1 / FOCUS_SETTINGS.secondsToRedLookingAway;
  else rate = -1 / FOCUS_SETTINGS.secondsToGreen;

  const redness = Math.min(1, Math.max(0, focus.redness + rate * seconds));
  const bonkNow = redness >= 1 && !focus.bonked;
  const memeVisible = redness >= 1 && (focus.memeVisible || focus.memeGap <= 0);
  let memeGap = memeVisible && !focus.memeVisible ? FOCUS_SETTINGS.memeGapSeconds : focus.memeGap;
  memeGap = Math.max(0, memeGap - seconds);

  return {
    redness,
    missingSeconds,
    faceHidden: handOverFace,
    bonked: bonkNow || (focus.bonked && redness > 0),
    distractions: focus.distractions + (bonkNow ? 1 : 0),
    memeVisible,
    memeGap,
    activeIndex,
    border: easeRgb(focus.border, mixRgb(safeColor(activeIndex), BORDER_RED, redness), seconds),
  };
}

/** The chosen meme is on screen. A new pop waits out the gap even if the border is fully red again. */
export function showMeme(focus: Focus): boolean {
  return focus.memeVisible;
}

export function focusState(focus: Focus): FocusState {
  if (focus.redness >= 1) return "left-work";
  if (focus.missingSeconds >= FOCUS_SETTINGS.leftChairGraceSeconds) return "left-chair";
  if (focus.faceHidden) return "face-hidden";
  return focus.redness > 0 ? "drifting" : "on-work";
}

/** Border colour: hue 130 (green) at redness 0, hue 0 (red) at redness 1. */
export function borderHue(redness: number): number {
  return Math.round(130 * (1 - redness));
}
