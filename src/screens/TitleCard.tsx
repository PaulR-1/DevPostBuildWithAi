import { useEffect } from "react";
import { playSessionEnd, playSessionStart } from "../uiSound";

const TITLE_MS = 2200;

/** Big title on a black faded background, then a fade. Used for "Session Start!" and "Session End". */
export default function TitleCard({ text, ending, onDone }: { text: string; ending?: boolean; onDone: () => void }) {
  useEffect(() => {
    if (ending) playSessionEnd();
    else playSessionStart();
  }, [ending]);

  useEffect(() => {
    const timer = setTimeout(onDone, TITLE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`title-card ${ending ? "title-card--end" : ""}`}>
      <h1 className="big-title">{text}</h1>
    </div>
  );
}
