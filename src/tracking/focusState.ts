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
};

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
};

export const START_FOCUS: Focus = {
  redness: 0,
  missingSeconds: 0,
  faceHidden: false,
  bonked: false,
  distractions: 0,
  memeVisible: false,
  memeGap: 0,
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

function isAngle(value: unknown): value is Angle {
  if (!value || typeof value !== "object") return false;
  const angle = value as Angle;
  return Number.isFinite(angle.yaw) && Number.isFinite(angle.pitch);
}

/** One saved angle. A list left by the short multi-spot experiment keeps its first angle. */
export function angleFromStored(value: unknown): Angle | null {
  if (Array.isArray(value)) return value.find(isAngle) ?? null;
  return isAngle(value) ? value : null;
}

/** Moves the focus forward by one frame lasting `seconds`. */
export function stepFocus(focus: Focus, reading: FocusReading, safe: Angle, seconds: number): Focus {
  const handOverFace = !reading.faceVisible && reading.bodyVisible && reading.handOverFace;
  const lookingDown = !reading.faceVisible && reading.bodyVisible && !reading.handOverFace;
  const gone = !reading.faceVisible && !reading.bodyVisible;
  const missingSeconds = gone ? focus.missingSeconds + seconds : 0;

  let rate: number;
  if (handOverFace) rate = 0;
  else if (gone) {
    rate = missingSeconds < FOCUS_SETTINGS.leftChairGraceSeconds ? 0 : 1 / FOCUS_SETTINGS.secondsToRedLeftChair;
  } else if (lookingDown || !isOnAngle(reading, safe)) rate = 1 / FOCUS_SETTINGS.secondsToRedLookingAway;
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
