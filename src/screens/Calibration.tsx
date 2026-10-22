import { useEffect, useRef, useState } from "react";
import type { Reading } from "../tracking/faceTracking";
import { averageAngle, type Angle } from "../tracking/focusState";
import type { TrackingStatus } from "../tracking/useTracking";

const COUNTDOWN_SECONDS = 3;
const SAMPLING_SECONDS = 1.5;
const MIN_SAMPLES = 10;

type Step = { name: "idle" } | { name: "countdown"; left: number } | { name: "sampling" } | { name: "failed" };

export default function Calibration({
  status,
  reading,
  savedAngle,
  onCalibrated,
  onCancel,
}: {
  status: TrackingStatus;
  reading: Reading | null;
  /** When set, offers to skip calibrating and reuse this angle. */
  savedAngle?: Angle | null;
  onCalibrated: (safe: Angle) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "idle" });
  const samples = useRef<Angle[] | null>(null);
  const onCalibratedRef = useRef(onCalibrated);
  onCalibratedRef.current = onCalibrated;

  useEffect(() => {
    if (samples.current && reading?.faceVisible) samples.current.push({ yaw: reading.yaw, pitch: reading.pitch });
  }, [reading]);

  useEffect(() => {
    if (step.name === "countdown") {
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
        if (got.length < MIN_SAMPLES) setStep({ name: "failed" });
        else onCalibratedRef.current(averageAngle(got));
      }, SAMPLING_SECONDS * 1000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const faceMissing = status === "ready" && reading !== null && !reading.faceVisible && step.name === "idle";

  let message: string;
  if (status === "loading") message = "Loading face tracking…";
  else if (status === "tracking-unavailable") message = "Face tracking is unavailable. Check your internet and reload.";
  else if (status === "camera-blocked") message = "Unblock the camera, then show your face.";
  else if (faceMissing) message = "Show your face so FocusRot can see where you are looking.";
  else if (step.name === "countdown") message = `Look at your laptop, phone, or notebook. ${step.left}`;
  else if (step.name === "sampling") message = "Hold still, keep looking…";
  else if (step.name === "failed") message = "Couldn't see your face while calibrating. Tilt a little less and try again.";
  else message = "Press calibrate, then look at your laptop, phone, or notebook.";

  const canCalibrate = status === "ready" && !faceMissing && (step.name === "idle" || step.name === "failed");

  return (
    <div className="calibration">
      <div className="calibration-panel">
        <p>{message}</p>
        <div className="calibration-actions">
          {canCalibrate && (
            <button className="calibration-primary" onClick={() => setStep({ name: "countdown", left: COUNTDOWN_SECONDS })}>
              Calibrate
            </button>
          )}
          <div className="calibration-secondary">
            <button className="calibration-quiet" onClick={onCancel}>
              Back
            </button>
            {canCalibrate && savedAngle && (
              <button className="calibration-quiet" onClick={() => onCalibrated(savedAngle)}>
                Use saved angle
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
