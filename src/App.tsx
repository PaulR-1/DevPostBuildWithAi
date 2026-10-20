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
  stepRedness,
  type Angle,
} from "./tracking/focusState";

type Status = "loading" | "camera-blocked" | "tracking-unavailable" | "ready";

const CALIBRATION_SECONDS = 1.5;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reading, setReading] = useState<Reading | null>(null);
  const [safeAngle, setSafeAngle] = useState<Angle | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [redness, setRedness] = useState(0);

  const safeRef = useRef<Angle | null>(null);
  const smoothRef = useRef<Angle | null>(null);
  const rednessRef = useRef(0);
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
        rednessRef.current = stepRedness(rednessRef.current, r, safeRef.current, seconds);
        setRedness(rednessRef.current);
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
    samplesRef.current = [];
    setCalibrating(true);
    setTimeout(() => {
      const samples = samplesRef.current ?? [];
      samplesRef.current = null;
      setCalibrating(false);
      if (samples.length === 0) return;
      const safe = averageAngle(samples);
      safeRef.current = safe;
      rednessRef.current = 0;
      setSafeAngle(safe);
      setRedness(0);
    }, CALIBRATION_SECONDS * 1000);
  };

  const hue = borderHue(redness);

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
              <div>State: {focusState(redness, reading)}</div>
              <div>Red: {Math.round(redness * 100)}%</div>
            </>
          )}
        </div>
      )}
      {status === "ready" && (
        <div className="calibrate-bar">
          {calibrating ? (
            <span>Keep looking at your laptop, phone, or notebook…</span>
          ) : (
            <button onClick={calibrate} disabled={!reading?.faceVisible}>
              {safeAngle ? "Recalibrate" : "Look at your work, then press to calibrate"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
