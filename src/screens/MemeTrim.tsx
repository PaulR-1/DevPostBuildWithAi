import { useEffect, useRef, useState, type PointerEvent, type RefObject } from "react";
import { clampTrim } from "../trimMedia";

/** Start and end handles for a clip that can be at most 15 seconds. */
export default function MemeTrim({
  kind,
  src,
  duration,
  start,
  end,
  onChange,
}: {
  kind: "image" | "video";
  src: string;
  duration: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const kept = Math.max(0, end - start);

  useEffect(() => {
    let cancelled = false;
    const ctx = new AudioContext();
    fetch(src)
      .then((response) => response.arrayBuffer())
      .then((bytes) => ctx.decodeAudioData(bytes))
      .then((buffer) => {
        const channel = buffer.getChannelData(0);
        const bars = 72;
        const block = Math.max(1, Math.floor(channel.length / bars));
        const next = Array.from({ length: bars }, (_, index) => {
          let loud = 0;
          const from = index * block;
          for (let sample = 0; sample < block; sample++) loud = Math.max(loud, Math.abs(channel[from + sample] ?? 0));
          return loud;
        });
        const loudest = Math.max(...next, 0.01);
        if (!cancelled) setPeaks(next.map((peak) => peak / loudest));
      })
      .catch(() => {
        if (!cancelled) setPeaks([]);
      })
      .finally(() => ctx.close().catch(() => {}));
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = start;
  }, [start, src]);

  const drag = (edge: "start" | "end", event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const track = trackRef.current;
    if (!track) return;
    const move = (pointer: globalThis.PointerEvent) => {
      const rect = track.getBoundingClientRect();
      const ratio = rect.width ? (pointer.clientX - rect.left) / rect.width : 0;
      const time = Math.min(duration, Math.max(0, ratio * duration));
      const next = clampTrim(edge === "start" ? time : start, edge === "end" ? time : end, duration, edge);
      onChange(next.start, next.end);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const play = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.currentTime = start;
    const watch = () => {
      if (media.currentTime >= end) {
        media.pause();
        media.removeEventListener("timeupdate", watch);
      }
    };
    media.addEventListener("timeupdate", watch);
    media.play().catch(() => media.removeEventListener("timeupdate", watch));
  };

  const left = duration ? (start / duration) * 100 : 0;
  const width = duration ? (kept / duration) * 100 : 0;

  return (
    <div className="meme-trim">
      {kind === "video" ? (
        <video ref={mediaRef as RefObject<HTMLVideoElement>} className="meme-trim-preview" src={src} playsInline preload="auto" />
      ) : (
        <audio ref={mediaRef as RefObject<HTMLAudioElement>} src={src} preload="auto" />
      )}
      <p>Keeping {kept < 10 ? kept.toFixed(1) : Math.round(kept)} seconds.</p>
      <div className="meme-trim-track" ref={trackRef}>
        {peaks.length > 0 && (
          <div className="meme-trim-wave" aria-hidden="true">
            {peaks.map((peak, index) => (
              <span key={index} style={{ height: `${Math.max(8, peak * 100)}%` }} />
            ))}
          </div>
        )}
        <div className="meme-trim-keep" style={{ left: `${left}%`, width: `${width}%` }} />
        <button type="button" className="meme-trim-handle meme-trim-handle--start" style={{ left: `${left}%` }} aria-label="Trim start" onPointerDown={(event) => drag("start", event)} />
        <button type="button" className="meme-trim-handle meme-trim-handle--end" style={{ left: `${left + width}%` }} aria-label="Trim end" onPointerDown={(event) => drag("end", event)} />
      </div>
      <button type="button" className="pill-button" onClick={play}>
        Play selection
      </button>
    </div>
  );
}
