import { useEffect, useRef, useState } from "react";
import {
  CameraBlockedError,
  loadFaceLandmarker,
  startCamera,
  stopCamera,
  trackFrames,
  type Reading,
} from "./tracking/faceTracking";
import {
  averageAngle,
  borderHue,
  focusState,
  smoothAngle,
  START_FOCUS,
  stepFocus,
  type Angle,
  type Focus,
} from "./tracking/focusState";

type Status = "loading" | "camera-blocked" | "tracking-unavailable" | "ready";
type Calibration = { step: "idle" } | { step: "countdown"; left: number } | { step: "sampling" } | { step: "failed" };

const COUNTDOWN_SECONDS = 3;
const SAMPLING_SECONDS = 1.5;
const MIN_SAMPLES = 10;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reading, setReading] = useState<Reading | null>(null);
  const [safeAngle, setSafeAngle] = useState<Angle | null>(null);
  const [calibration, setCalibration] = useState<Calibration>({ step: "idle" });
  const [focus, setFocus] = useState<Focus>(START_FOCUS);

  const safeRef = useRef<Angle | null>(null);
  const smoothRef = useRef<Angle | null>(null);
  const focusRef = useRef<Focus>(START_FOCUS);
  const lastFrameRef = useRef(0);
  const samplesRef = useRef<Angle[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopTracking = () => {};

    const onReading = (raw: Reading) => {
      const now = performance.now();
      const seconds = lastFrameRef.current ? Math.min(0.2, (now - lastFrameRef.current) / 1000) : 0;
      lastFrameRef.current = now;

      if (raw.faceVisible) smoothRef.current = smoothAngle(smoothRef.current, raw);
      const r: Reading = raw.faceVisible ? { faceVisible: true, ...smoothRef.current! } : raw;
      setReading(r);

      if (samplesRef.current && r.faceVisible) samplesRef.current.push({ yaw: r.yaw, pitch: r.pitch });

      if (safeRef.current) {
        focusRef.current = stepFocus(focusRef.current, r, safeRef.current, seconds);
        setFocus(focusRef.current);
      }
    };

    (async () => {
      const video = videoRef.current!;
      try {
        stream = await startCamera(video);
        const landmarker = await loadFaceLandmarker();
        if (cancelled) return;
        setStatus("ready");
        stopTracking = trackFrames(video, landmarker, onReading);
      } catch (err) {
        if (cancelled) return;
        setStatus(err instanceof CameraBlockedError ? "camera-blocked" : "tracking-unavailable");
      }
    })();

    return () => {
      cancelled = true;
      stopTracking();
      stopCamera(stream);
    };
  }, []);

  const calibrate = () => {
    let left = COUNTDOWN_SECONDS;
    setCalibration({ step: "countdown", left });
    const timer = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCalibration({ step: "countdown", left });
        return;
      }
      clearInterval(timer);
      samplesRef.current = [];
      setCalibration({ step: "sampling" });
      setTimeout(() => {
        const samples = samplesRef.current ?? [];
        samplesRef.current = null;
        if (samples.length < MIN_SAMPLES) {
          setCalibration({ step: "failed" });
          return;
        }
        const safe = averageAngle(samples);
        safeRef.current = safe;
        focusRef.current = START_FOCUS;
        setSafeAngle(safe);
        setFocus(START_FOCUS);
        setCalibration({ step: "idle" });
      }, SAMPLING_SECONDS * 1000);
    }, 1000);
  };

  const hue = borderHue(focus.redness);

  return (
    <div className="session">
      <video ref={videoRef} className="camera" playsInline muted />
      {safeAngle && (
        <div
          className="focus-border"
          style={{ boxShadow: `inset 0 0 90px 35px hsla(${hue}, 90%, 50%, 0.6)` }}
        />
      )}
      {status === "loading" && <div className="notice">Loading face tracking…</div>}
      {status === "camera-blocked" && (
        <div className="notice">Unblock the camera and show your face.</div>
      )}
      {status === "tracking-unavailable" && (
        <div className="notice">Face tracking is unavailable. Check your internet and reload.</div>
      )}
      {status === "ready" && reading && (
        <div className="readout">
          <div>Face: {reading.faceVisible ? "visible" : "not visible"}</div>
          <div>Left/right: {reading.yaw.toFixed(1)}°</div>
          <div>Up/down: {reading.pitch.toFixed(1)}°</div>
          {safeAngle && (
            <>
              <div>
                Safe: {safeAngle.yaw.toFixed(1)}° / {safeAngle.pitch.toFixed(1)}°
              </div>
              <div>State: {focusState(focus)}</div>
              <div>Red: {Math.round(focus.redness * 100)}%</div>
            </>
          )}
        </div>
      )}
      {status === "ready" && (
        <div className="calibrate-bar">
          {calibration.step === "countdown" && (
            <span>Look at your laptop, phone, or notebook now… {calibration.left}</span>
          )}
          {calibration.step === "sampling" && <span>Hold still, keep looking…</span>}
          {(calibration.step === "idle" || calibration.step === "failed") && (
            <button onClick={calibrate}>
              {calibration.step === "failed"
                ? "Couldn't see your face while calibrating. Tilt a little less and try again"
                : safeAngle
                  ? "Recalibrate"
                  : "Press to calibrate, then look at your work"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
