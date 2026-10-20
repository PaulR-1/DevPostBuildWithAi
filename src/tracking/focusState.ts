export type Angle = { yaw: number; pitch: number };

export type FocusReading = Angle & { faceVisible: boolean };

export type FocusState = "on-work" | "drifting" | "left-work" | "left-chair";

export const FOCUS_SETTINGS = {
  /** Degrees left/right of the safe angle that still count as on the work. */
  yawTolerance: 15,
  /** Degrees up/down of the safe angle that still count as on the work. */
  pitchTolerance: 12,
  /** Seconds of looking away to go from fully green to fully red. */
  secondsToRedLookingAway: 6,
  /** Seconds out of the chair to go from fully green to fully red. */
  secondsToRedLeftChair: 2.5,
  /** Seconds of looking back to go from fully red to fully green. */
  secondsToGreen: 3,
  /** How much each new frame moves the smoothed angle (0 to 1). */
  smoothing: 0.25,
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

/** Moves redness (0 = green, 1 = red) for one frame lasting `seconds`. */
export function stepRedness(redness: number, reading: FocusReading, safe: Angle, seconds: number): number {
  let rate: number;
  if (!reading.faceVisible) rate = 1 / FOCUS_SETTINGS.secondsToRedLeftChair;
  else if (!isOnAngle(reading, safe)) rate = 1 / FOCUS_SETTINGS.secondsToRedLookingAway;
  else rate = -1 / FOCUS_SETTINGS.secondsToGreen;
  return Math.min(1, Math.max(0, redness + rate * seconds));
}

export function focusState(redness: number, reading: FocusReading): FocusState {
  if (redness >= 1) return "left-work";
  if (!reading.faceVisible) return "left-chair";
  return redness > 0 ? "drifting" : "on-work";
}

/** Border colour: hue 130 (green) at redness 0, hue 0 (red) at redness 1. */
export function borderHue(redness: number): number {
  return Math.round(130 * (1 - redness));
}
