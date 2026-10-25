import { useEffect, useRef, useState, type ReactNode } from "react";
import { MEME_FADE_MS } from "../memeSound";
import type { Meme } from "../memes";
import { borderHue, showMeme, type Focus } from "../tracking/focusState";
import MemeBonk from "./MemeBonk";
import { usePresence } from "./usePresence";

function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function Session({
  focus,
  meme,
  paused,
  onPause,
  onPlay,
  onStop,
  onOpenSettings,
}: {
  focus: Focus;
  meme: Meme;
  paused: boolean;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
  onOpenSettings: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const showMenu = paused || menuOpen;
  const menuPresence = usePresence(showMenu);
  const hue = borderHue(focus.redness);
  const wantMeme = showMeme(focus) && !paused;
  const heldMeme = useRef(false);
  const [memeHeld, setMemeHeld] = useState(false);
  const [memeLeaving, setMemeLeaving] = useState(false);

  useEffect(() => {
    if (wantMeme) {
      heldMeme.current = true;
      setMemeHeld(true);
      setMemeLeaving(false);
      return;
    }
    if (!heldMeme.current) return;
    setMemeLeaving(true);
    const timer = window.setTimeout(() => {
      heldMeme.current = false;
      setMemeHeld(false);
      setMemeLeaving(false);
    }, MEME_FADE_MS);
    return () => clearTimeout(timer);
  }, [wantMeme]);

  useEffect(() => {
    if (!showMenu || paused) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showMenu, paused]);

  return (
    <>
      <div
        className="focus-border"
        style={{
          boxShadow: `inset 0 0 160px 56px hsla(${hue}, 92%, 52%, 0.42), inset 0 0 0 1px hsla(${hue}, 90%, 68%, 0.55)`,
        }}
      />
      {memeHeld && <MemeBonk meme={meme} leaving={memeLeaving} />}
      <div className="bubble">
        <button
          className="bubble-icon"
          data-sound={!paused && menuOpen ? "drop" : undefined}
          onClick={() => {
            if (!paused) setMenuOpen((open) => !open);
          }}
          aria-label="Session controls"
          aria-expanded={showMenu}
        >
          <img src="/app-icon.svg" alt="" />
        </button>
        {menuPresence.mounted && (
          <div className="bubble-menu" data-phase={menuPresence.phase} onTransitionEnd={menuPresence.onTransitionEnd}>
            {paused ? (
              <button
                autoFocus
                onClick={() => {
                  setMenuOpen(false);
                  onPlay();
                }}
              >
                <MenuIcon>
                  <polygon points="8 5 19 12 8 19" fill="currentColor" stroke="none" />
                </MenuIcon>
                Play
              </button>
            ) : (
              <button onClick={onPause}>
                <MenuIcon>
                  <path d="M9 6v12M15 6v12" />
                </MenuIcon>
                Pause
              </button>
            )}
            <button data-sound="drop" onClick={onStop}>
              <MenuIcon>
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
              </MenuIcon>
              Stop
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
            >
              <MenuIcon>
                <line x1="4" y1="7" x2="20" y2="7" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="9" cy="7" r="2.25" />
                <circle cx="15" cy="17" r="2.25" />
              </MenuIcon>
              Settings
            </button>
          </div>
        )}
      </div>
    </>
  );
}
