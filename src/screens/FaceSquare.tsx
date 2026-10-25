import { useLayoutEffect, useState, type RefObject } from "react";
import type { FaceBox } from "../tracking/faceLock";
import { rgba, type Rgb } from "../tracking/focusState";

type Place = { x: number; y: number; side: number };

/** Maps a normalized face box onto the mirrored, cover-cropped camera element. */
function placeFaceSquare(video: HTMLVideoElement, box: FaceBox): Place | null {
  const frameWidth = video.videoWidth;
  const frameHeight = video.videoHeight;
  const viewWidth = video.clientWidth;
  const viewHeight = video.clientHeight;
  if (!frameWidth || !frameHeight || !viewWidth || !viewHeight) return null;

  const scale = Math.max(viewWidth / frameWidth, viewHeight / frameHeight);
  const displayedWidth = frameWidth * scale;
  const displayedHeight = frameHeight * scale;
  const cropX = (displayedWidth - viewWidth) / 2;
  const cropY = (displayedHeight - viewHeight) / 2;
  const pixelX = box.x * frameWidth * scale - cropX;
  const pixelY = box.y * frameHeight * scale - cropY;

  return {
    x: viewWidth - pixelX,
    y: pixelY,
    side: box.size * displayedWidth,
  };
}

/** Square around the locked face. Color matches the focus haze while a session is scoring. */
export default function FaceSquare({
  videoRef,
  box,
  color,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  box: FaceBox;
  color: Rgb;
}) {
  const [at, setAt] = useState<Place | null>(null);

  useLayoutEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const measure = () => setAt(placeFaceSquare(video, box));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(video);
    return () => observer.disconnect();
  }, [videoRef, box]);

  if (!at) return null;

  return (
    <div
      className="face-square"
      style={{
        left: at.x,
        top: at.y,
        width: at.side,
        height: at.side,
        borderColor: rgba(color, 0.95),
        background: rgba(color, 0.28),
      }}
    />
  );
}
