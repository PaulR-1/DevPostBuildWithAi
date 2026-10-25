import { useEffect, useRef, useState } from "react";
import type { Reading } from "../tracking/faceTracking";
import { averageAngle, MAX_SAVED_ANGLES, type Angle } from "../tracking/focusState";
import type { TrackingStatus } from "../tracking/useTracking";
import { playCountdown } from "../uiSound";

const COUNTDOWN_SECONDS = 3;
const SAMPLING_SECONDS = 1.5;
const MIN_SAMPLES = 10;

type Step = { name: "idle" } | { name: "countdown"; left: number } | { name: "sampling" } | { name: "failed" };
type Screen = "ask" | "capture" | "another";

export default function Calibration({
  status,
  reading,
  onCalibrated,
  onCapturing,
  onCancel,
}: {
  status: TrackingStatus;
  reading: Reading | null;
  onCalibrated: (safes: Angle[]) => void;
  /** Which spot is about to be saved, so the face square can take that color. */
  onCapturing?: (index: number) => void;
  onCancel: () => void;
}) {
  const [screen, setScreen] = useState<Screen>("ask");
  const [step, setStep] = useState<Step>({ name: "idle" });
  const [kept, setKept] = useState<Angle[]>([]);
  const samples = useRef<Angle[] | null>(null);
  const keptRef = useRef<Angle[]>([]);
  const multiRef = useRef(false);
  const onCalibratedRef = useRef(onCalibrated);
  const onCapturingRef = useRef(onCapturing);
  onCalibratedRef.current = onCalibrated;
  onCapturingRef.current = onCapturing;

  useEffect(() => {
    if (samples.current && reading?.faceVisible) samples.current.push({ yaw: reading.yaw, pitch: reading.pitch });
  }, [reading]);

  useEffect(() => {
    if (step.name === "countdown") {
      playCountdown(step.left);
      const timer = setTimeout(() => {
        if (step.left > 1) setStep({ name: "countdown", left: step.left - 1 });
        else {
          samples.current = [];
          setStep({ name: "sampling" });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (step.name === "sampling") {
      const timer = setTimeout(() => {
        const got = samples.current ?? [];
        samples.current = null;
        if (got.length < MIN_SAMPLES) {
          setStep({ name: "failed" });
          return;
        }
        const next = [...keptRef.current, averageAngle(got)];
        keptRef.current = next;
        setKept(next);
        setStep({ name: "idle" });
        if (multiRef.current) setScreen("another");
        else onCalibratedRef.current(next);
      }, SAMPLING_SECONDS * 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const begin = (several: boolean) => {
    multiRef.current = several;
    keptRef.current = [];
    setKept([]);
    setScreen("capture");
    setStep({ name: "countdown", left: COUNTDOWN_SECONDS });
    onCapturingRef.current?.(0);
  };

  const addAnother = () => {
    setScreen("capture");
    setStep({ name: "countdown", left: COUNTDOWN_SECONDS });
    onCapturingRef.current?.(keptRef.current.length);
  };

  const faceMissing = status === "ready" && reading !== null && !reading.faceVisible && screen !== "another";
  const ready = status === "ready" && !faceMissing;

  let message: string;
  if (status === "loading") message = "Loading face tracking…";
  else if (status === "tracking-unavailable") message = "Face tracking is unavailable. Check your internet and reload.";
  else if (status === "camera-blocked") message = "Unblock the camera, then show your face.";
  else if (faceMissing) message = "Show your face so FocusRot can see where you are looking.";
  else if (screen === "ask") message = "Save more than one angle? You can mark up to three spots, like the laptop and the notebook. Each one counts as on the work.";
  else if (step.name === "countdown") {
    const spot = multiRef.current ? `Look at spot ${kept.length + 1}.` : "Look at your laptop, phone, or notebook.";
    message = `${spot} ${step.left}`;
  } else if (step.name === "sampling") message = "Hold still, keep looking…";
  else if (step.name === "failed") message = "Couldn't see your face while calibrating. Tilt a little less and try again.";
  else if (kept.length >= MAX_SAVED_ANGLES) message = "Three spots saved. That's the limit.";
  else if (kept.length === 1) message = "One spot saved. Add another, or start with this one.";
  else message = `${kept.length} spots saved. Add another, or start with these.`;

  const showAsk = screen === "ask" && ready;
  const showCapture = screen === "capture" && (step.name === "idle" || step.name === "failed") && ready;
  const showAnother = screen === "another";

  return (
    <div className="calibration">
      <div className="calibration-panel">
        <p>{message}</p>
        <div className="calibration-actions">
          {showAsk && (
            <>
              <button className="calibration-primary" onClick={() => begin(false)}>
                Just one
              </button>
              <button className="calibration-alt" onClick={() => begin(true)}>
                More than one
              </button>
            </>
          )}
          {showCapture && (
            <button className="calibration-primary" onClick={() => setStep({ name: "countdown", left: COUNTDOWN_SECONDS })}>
              {step.name === "failed" ? "Try again" : "Calibrate"}
            </button>
          )}
          {showAnother && kept.length < MAX_SAVED_ANGLES && (
            <button className="calibration-primary" onClick={addAnother}>
              Add another
            </button>
          )}
          {showAnother && (
            <button className="calibration-alt" onClick={() => onCalibrated(kept)}>
              Done
            </button>
          )}
          <div className="calibration-secondary">
            <button className="calibration-quiet" data-sound="drop" onClick={onCancel}>
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
