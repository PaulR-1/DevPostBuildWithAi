import { MEME_MAX_SECONDS } from "./memes.ts";

export const MIN_TRIM_SECONDS = 0.5;

/** Keeps the selection at least half a second and at most 15. Moving one handle pulls the other when it must. */
export function clampTrim(start: number, end: number, duration: number, moved: "start" | "end"): { start: number; end: number } {
  const maxKeep = Math.min(MEME_MAX_SECONDS, duration);
  const minKeep = Math.min(MIN_TRIM_SECONDS, maxKeep);
  let s = start;
  let e = end;
  if (moved === "start") {
    s = Math.min(Math.max(0, s), Math.max(0, duration - minKeep));
    if (e - s < minKeep) e = Math.min(duration, s + minKeep);
    if (e - s > maxKeep) e = s + maxKeep;
    if (e > duration) {
      e = duration;
      s = Math.max(0, e - maxKeep);
    }
  } else {
    e = Math.max(minKeep, Math.min(duration, e));
    if (e - s < minKeep) s = Math.max(0, e - minKeep);
    if (e - s > maxKeep) s = Math.max(0, e - maxKeep);
    if (s < 0) {
      s = 0;
      e = Math.min(duration, maxKeep);
    }
  }
  return { start: s, end: e };
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const samples = buffer.length;
  const blockAlign = channels * 2;
  const dataSize = samples * blockAlign;
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  const pcm = new DataView(new ArrayBuffer(dataSize));
  const data = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  let offset = 0;
  for (let i = 0; i < samples; i++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, data[channel][i]));
      pcm.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([header, pcm.buffer], { type: "audio/wav" });
}

/** Copies the chosen stretch of a sound into a short wav. */
export async function trimAudio(file: Blob, start: number, end: number): Promise<Blob> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const from = Math.max(0, Math.floor(start * decoded.sampleRate));
    const to = Math.min(decoded.length, Math.ceil(end * decoded.sampleRate));
    const length = Math.max(1, to - from);
    const slice = ctx.createBuffer(decoded.numberOfChannels, length, decoded.sampleRate);
    for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
      slice.getChannelData(channel).set(decoded.getChannelData(channel).subarray(from, to));
    }
    return encodeWav(slice);
  } finally {
    await ctx.close();
  }
}

type Capturable = HTMLVideoElement & { captureStream?: () => MediaStream };

/** Records the chosen stretch of a video. Chrome plays it once and keeps that piece. */
export function trimVideo(src: string, start: number, end: number): Promise<Blob> {
  const video = document.createElement("video");
  video.src = src;
  video.playsInline = true;
  video.muted = false;
  return new Promise((resolve, reject) => {
    const fail = () => reject(new Error("uncuttable"));
    video.onerror = fail;
    video.onloadeddata = () => {
      video.onseeked = () => {
        const stream = (video as Capturable).captureStream?.();
        if (!stream || typeof MediaRecorder === "undefined") {
          fail();
          return;
        }
        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm";
        let recorder: MediaRecorder;
        try {
          recorder = new MediaRecorder(stream, { mimeType: mime });
        } catch {
          fail();
          return;
        }
        const chunks: Blob[] = [];
        recorder.ondataavailable = (event) => {
          if (event.data.size) chunks.push(event.data);
        };
        recorder.onerror = fail;
        recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
        const stopAtEnd = () => {
          if (video.currentTime >= end - 0.05 || video.ended) {
            video.pause();
            if (recorder.state !== "inactive") recorder.stop();
            return;
          }
          requestAnimationFrame(stopAtEnd);
        };
        recorder.start();
        video.play().then(stopAtEnd).catch(fail);
      };
      video.currentTime = start;
    };
  });
}
