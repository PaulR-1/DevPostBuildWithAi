import { useEffect, useRef, useState } from "react";
import { BONK_SRC, MEME_FADE_MS, playFile, playSting, SPLASH_SRC, type Playing } from "../memeSound";
import { isCustomMeme, type Meme } from "../memes";

const BUBBLES = Array.from({ length: 52 }, (_, i) => ({
  id: i,
  left: `${(i * 13) % 100}%`,
  bottom: `${8 + (i % 9) * 8}%`,
  delay: `${(i % 10) * 0.03}s`,
  size: `${14 + (i % 8) * 12}px`,
  duration: `${0.7 + (i % 6) * 0.12}s`,
}));

function fadeMedia(media: HTMLMediaElement, ms: number) {
  const start = media.volume;
  const began = performance.now();
  const step = () => {
    const passed = Math.min(1, (performance.now() - began) / ms);
    media.volume = start * (1 - passed);
    if (passed < 1 && !media.paused) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Plays the meme once. `leaving` fades the picture and the sound together. */
export default function MemeBonk({ meme, leaving }: { meme: Meme; leaving: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const players = useRef<Playing[]>([]);
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;
  const builtin = !isCustomMeme(meme.id);
  const [bubbles, setBubbles] = useState(meme.ending === "splash");
  const [flash, setFlash] = useState(builtin);
  const [bonkWord, setBonkWord] = useState(builtin);

  useEffect(() => {
    let cancelled = false;
    const active: Playing[] = [];
    players.current = active;
    const video = videoRef.current;

    const track = (playing: Playing) => {
      active.push(playing);
      return playing;
    };

    const endClip = () => {
      if (cancelled || leavingRef.current) return;
      if (!builtin && meme.ending === "bonk") {
        track(playFile(BONK_SRC));
        setBonkWord(true);
      }
    };

    if (builtin) track(playFile(BONK_SRC));
    if (meme.ending === "splash") track(playFile(SPLASH_SRC));

    if (meme.kind === "video" && video) {
      video.volume = 1;
      video.currentTime = 0;
      video.onended = endClip;
      video.play().catch(endClip);
    } else if (meme.audioSrc) {
      track(playFile(meme.audioSrc)).done.then(endClip);
    } else if (meme.ending === "bonk") {
      track(playSting()).done.then(endClip);
    } else {
      endClip();
    }

    return () => {
      cancelled = true;
      active.forEach((playing) => playing.stop());
      if (video) {
        video.onended = null;
        video.pause();
      }
    };
  }, [meme]);

  useEffect(() => {
    if (!leaving) return;
    players.current.forEach((playing) => playing.fade(MEME_FADE_MS));
    const video = videoRef.current;
    if (video) fadeMedia(video, MEME_FADE_MS);
  }, [leaving]);

  return (
    <div className={`meme-bonk${leaving ? " meme-bonk--leaving" : ""}`}>
      {meme.kind === "video" ? (
        <video ref={videoRef} src={meme.src} playsInline />
      ) : (
        <img src={meme.src} alt={meme.name} />
      )}
      {bubbles && (
        <div className="meme-bubbles" aria-hidden="true">
          {BUBBLES.map((bubble) => (
            <span
              key={bubble.id}
              style={{
                left: bubble.left,
                bottom: bubble.bottom,
                animationDelay: bubble.delay,
                animationDuration: bubble.duration,
                width: bubble.size,
                height: bubble.size,
              }}
            />
          ))}
        </div>
      )}
      {bonkWord && (
        <p className="meme-bonk-word" onAnimationEnd={() => setBonkWord(false)}>
          BONK !
        </p>
      )}
      {flash && <div className="meme-flash" onAnimationEnd={() => setFlash(false)} />}
    </div>
  );
}
