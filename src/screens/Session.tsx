import { useState } from "react";
import { borderHue, type Focus } from "../tracking/focusState";

export default function Session({
  focus,
  paused,
  onPause,
  onPlay,
  onStop,
}: {
  focus: Focus;
  paused: boolean;
  onPause: () => void;
  onPlay: () => void;
  onStop: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const hue = borderHue(focus.redness);

  return (
    <>
      <div className="focus-border" style={{ boxShadow: `inset 0 0 90px 35px hsla(${hue}, 90%, 50%, 0.6)` }} />
      <div className="bubble">
        <button className="bubble-icon" onClick={() => setMenuOpen((open) => !open)} aria-label="Session controls">
          <img src="/app-icon.svg" alt="" />
        </button>
        {menuOpen && (
          <div className="bubble-menu">
            {paused ? (
              <button onClick={onPlay}>▶ Play</button>
            ) : (
              <button onClick={onPause}>❚❚ Pause</button>
            )}
            <button onClick={onStop}>■ Stop</button>
          </div>
        )}
      </div>
    </>
  );
}
