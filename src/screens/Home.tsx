import { useEffect, useState } from "react";
import { formatDuration } from "../sessionClock";
import { listSessions, type PastSession } from "../storage/focusDb";
import MemeStorage from "./MemeStorage";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function Home({
  onStart,
  chosenMemeId,
  onChooseMeme,
  onOpenSession,
}: {
  onStart: () => void;
  chosenMemeId: string;
  onChooseMeme: (id: string) => void;
  onOpenSession: (session: PastSession) => void;
}) {
  const [sessions, setSessions] = useState<PastSession[] | null>(null);

  useEffect(() => {
    listSessions().then(setSessions, () => setSessions([]));
  }, []);

  return (
    <main className="home">
      <header className="home-header">
        <img className="app-icon" src="/app-icon.svg" alt="" />
        <h1>FocusRot</h1>
      </header>

      <section className="home-card">
        <h2>Past sessions</h2>
        {sessions && sessions.length === 0 && (
          <p className="muted">Nothing here yet. Press start to begin your first session.</p>
        )}
        {sessions && sessions.length > 0 && (
          <ul className="session-list">
            {sessions.map((s) => (
              <li key={s.id}>
                <button onClick={() => onOpenSession(s)}>
                  {dateFormat.format(s.finishedAt)} · {formatDuration(s.sessionLengthMs)} session ·{" "}
                  {s.distractions} {s.distractions === 1 ? "distraction" : "distractions"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MemeStorage chosenId={chosenMemeId} onChoose={onChooseMeme} />

      <button className="start-button" onClick={onStart}>
        Start
      </button>
    </main>
  );
}
