import { useEffect, useRef, useState } from "react";
import {
  CameraBlockedError,
  loadFaceLandmarker,
  startCamera,
  stopCamera,
  trackFrames,
  type Reading,
} from "./tracking/faceTracking";

type Status = "loading" | "camera-blocked" | "tracking-unavailable" | "ready";

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [reading, setReading] = useState<Reading | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopTracking = () => {};

    (async () => {
      const video = videoRef.current!;
      try {
        stream = await startCamera(video);
        const landmarker = await loadFaceLandmarker();
        if (cancelled) return;
        setStatus("ready");
        stopTracking = trackFrames(video, landmarker, setReading);
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

  return (
    <div className="session">
      <video ref={videoRef} className="camera" playsInline muted />
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
        </div>
      )}
    </div>
  );
}
