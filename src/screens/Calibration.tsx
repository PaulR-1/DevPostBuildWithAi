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
  onCalibrated,
  onCancel,
}: {
  status: TrackingStatus;
  reading: Reading | null;
  onCalibrated: (safe: Angle) => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "idle" });
  const samples = useRef<Angle[] | null>(null);

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
        else onCalibrated(averageAngle(got));
      }, SAMPLING_SECONDS * 1000);
      return () => clearTimeout(timer);
    }
  }, [step, onCalibrated]);

  const faceMissing = status === "ready" && reading !== null && !reading.faceVisible && step.name === "idle";

  let message: string;
  if (status === "loading") message = "Loading face tracking…";
  else if (status === "tracking-unavailable") message = "Face tracking is unavailable. Check your internet and reload.";
  else if (status === "camera-blocked" || faceMissing) message = "Unblock the camera and show your face.";
  else if (step.name === "countdown") message = `Look at your laptop, phone, or notebook now… ${step.left}`;
  else if (step.name === "sampling") message = "Hold still, keep looking…";
  else if (step.name === "failed") message = "Couldn't see your face while calibrating. Tilt a little less and try again.";
  else message = "Press calibrate, then look at your laptop, phone, or notebook.";

  const canCalibrate = status === "ready" && !faceMissing && (step.name === "idle" || step.name === "failed");

  return (
    <div className="calibration">
      <div className="calibration-panel">
        <p>{message}</p>
        <div className="calibration-actions">
          <button className="pill-button" onClick={onCancel}>
            Back
          </button>
          {canCalibrate && (
            <button className="pill-button pill-button--primary" onClick={() => setStep({ name: "countdown", left: COUNTDOWN_SECONDS })}>
              Calibrate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
