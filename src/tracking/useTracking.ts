import { useEffect, useRef, useState, type RefObject } from "react";
import { CameraBlockedError, loadTrackers, startCamera, stopCamera, trackFrames, type Reading } from "./faceTracking";
import { smoothAngle, type Angle } from "./focusState";

export type TrackingStatus = "loading" | "camera-blocked" | "tracking-unavailable" | "ready";

/** Runs the camera and tracking while `active`. Calls `onReading` with each smoothed frame and its length in seconds. */
export function useTracking(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  onReading: (reading: Reading, seconds: number) => void,
) {
  const [status, setStatus] = useState<TrackingStatus>("loading");
  const [reading, setReading] = useState<Reading | null>(null);
  const callback = useRef(onReading);
  callback.current = onReading;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let stopTracking = () => {};
    let smooth: Angle | null = null;
    let lastFrame = 0;
    setStatus("loading");
    setReading(null);

    const handle = (raw: Reading) => {
      const now = performance.now();
      // Hidden tabs can slow frames to about one per second, so allow up to that.
      const seconds = lastFrame ? Math.min(1, (now - lastFrame) / 1000) : 0;
      lastFrame = now;
      if (raw.faceVisible) smooth = smoothAngle(smooth, raw);
      const r: Reading = raw.faceVisible ? { ...raw, ...smooth! } : raw;
      setReading(r);
      callback.current(r, seconds);
    };

    (async () => {
      const video = videoRef.current!;
      try {
        const started = await startCamera(video);
        if (cancelled) return stopCamera(started);
        stream = started;
        const trackers = await loadTrackers();
        if (cancelled) return;
        setStatus("ready");
        stopTracking = trackFrames(video, trackers, handle);
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
  }, [active, videoRef]);

  return { status, reading };
}
