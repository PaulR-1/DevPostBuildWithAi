export type Angle = { yaw: number; pitch: number };

export type FocusReading = Angle & { faceVisible: boolean; bodyVisible: boolean };

export type FocusState = "on-work" | "drifting" | "left-work" | "face-hidden" | "left-chair";

export type Focus = {
  /** 0 = fully green, 1 = fully red. */
  redness: number;
  /** How long the face and body have both been missing without a break. */
  missingSeconds: number;
  /** Face missing but body still in the chair. */
  faceHidden: boolean;
};

export const FOCUS_SETTINGS = {
  /** Degrees left/right of the safe angle that still count as on the work. */
  yawTolerance: 15,
  /** Degrees up/down of the safe angle that still count as on the work. */
  pitchTolerance: 12,
  /** Seconds of looking away to go from fully green to fully red. */
  secondsToRedLookingAway: 8,
  /** Seconds out of the chair to go from fully green to fully red. */
  secondsToRedLeftChair: 3.5,
  /** Seconds of looking back to go from fully red to fully green. */
  secondsToGreen: 3,
  /** Face and body missing for less than this is a tracking blip, not leaving the chair. */
  leftChairGraceSeconds: 1.5,
  /** How much each new frame moves the smoothed angle (0 to 1). */
  smoothing: 0.25,
};

export const START_FOCUS: Focus = { redness: 0, missingSeconds: 0, faceHidden: false };

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

/** Moves the focus forward by one frame lasting `seconds`. */
export function stepFocus(focus: Focus, reading: FocusReading, safe: Angle, seconds: number): Focus {
  const faceHidden = !reading.faceVisible && reading.bodyVisible;
  const gone = !reading.faceVisible && !reading.bodyVisible;
  const missingSeconds = gone ? focus.missingSeconds + seconds : 0;

  let rate: number;
  if (faceHidden) rate = 0;
  else if (gone) {
    rate = missingSeconds < FOCUS_SETTINGS.leftChairGraceSeconds ? 0 : 1 / FOCUS_SETTINGS.secondsToRedLeftChair;
  } else if (!isOnAngle(reading, safe)) rate = 1 / FOCUS_SETTINGS.secondsToRedLookingAway;
  else rate = -1 / FOCUS_SETTINGS.secondsToGreen;

  return { redness: Math.min(1, Math.max(0, focus.redness + rate * seconds)), missingSeconds, faceHidden };
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
