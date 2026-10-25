import type { Meme } from "../memes";

/** Picture, or the first frame of a video, for the home grid and launch card. */
export default function MemePreview({ meme, className }: { meme: Meme; className?: string }) {
  if (meme.kind === "video") {
    return <video className={className} src={meme.src} muted playsInline preload="metadata" />;
  }
  return <img className={className} src={meme.src} alt="" />;
}
