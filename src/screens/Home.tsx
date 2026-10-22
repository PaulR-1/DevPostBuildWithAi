import { useEffect, useState, type CSSProperties } from "react";
import type { Meme } from "../memes";
import { formatDuration } from "../sessionClock";
import { listSessions, type PastSession } from "../storage/focusDb";
import AccountMenu from "./AccountMenu";
import MemeStorage from "./MemeStorage";

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function dayKey(time: number): string {
  const day = new Date(time);
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

/** Days in a row with a session, still alive if the latest one was yesterday. */
function streakDays(sessions: PastSession[]): number {
  const days = new Set(sessions.map((session) => dayKey(session.finishedAt)));
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Home({
  onStart,
  memes,
  chosenMemeId,
  onChooseMeme,
  onAddMeme,
  onRemoveMeme,
  onOpenSession,
  onOpenSettings,
  sessionsEpoch,
}: {
  onStart: () => void;
  memes: Meme[];
  chosenMemeId: string;
  onChooseMeme: (id: string) => void;
  onAddMeme: (meme: Meme) => void;
  onRemoveMeme: (id: string) => void;
  onOpenSession: (session: PastSession) => void;
  onOpenSettings: () => void;
  sessionsEpoch: number;
}) {
  const [sessions, setSessions] = useState<PastSession[] | null>(null);

  useEffect(() => {
    listSessions().then(setSessions, () => setSessions([]));
  }, [sessionsEpoch]);

  const chosen = memes.find((meme) => meme.id === chosenMemeId) ?? memes[0];
  const focusMs = sessions?.reduce((total, session) => total + session.sessionLengthMs, 0) ?? 0;
  const distractions = sessions?.reduce((total, session) => total + session.distractions, 0) ?? 0;
  const recent = sessions ? [...sessions].slice(0, 8).reverse() : [];
  const longest = recent.reduce((max, session) => Math.max(max, session.sessionLengthMs), 0);

  return (
    <main className="home">
      <div className="home-body">
        <header className="home-header">
          <img className="app-icon" src="/app-icon.svg" alt="" />
          <h1>FocusRot</h1>
          <AccountMenu memes={memes} onOpenSettings={onOpenSettings} />
        </header>

        <section className="home-card home-launch" aria-label="Start session">
          <div className="home-launch-main">
            {chosen && <img className="home-launch-meme" src={chosen.src} alt="" />}
            <div className="home-launch-copy">
              <p className="muted">Chosen meme</p>
              <strong>{chosen?.name ?? "Meme"}</strong>
            </div>
            <button className="start-button" onClick={onStart}>
              Start
            </button>
          </div>
          <div className="home-focus">
            <dl>
              <div className="home-focus-bonks">
                <dt>Bonks</dt>
                <dd>{sessions ? distractions : "—"}</dd>
              </div>
              <div>
                <dt>Focus</dt>
                <dd>{sessions ? formatDuration(focusMs) : "—"}</dd>
              </div>
              <div>
                <dt>Sessions</dt>
                <dd>{sessions ? sessions.length : "—"}</dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd>{sessions ? streakDays(sessions) : "—"}</dd>
              </div>
            </dl>
            {sessions && recent.length > 0 && (
              <div className="focus-bars" role="group" aria-label="Recent sessions">
                {recent.map((session) => (
                  <button
                    key={session.id}
                    className="focus-bar"
                    style={{ "--h": longest === 0 ? "100%" : `${Math.max(18, Math.round((session.sessionLengthMs / longest) * 100))}%` } as CSSProperties}
                    onClick={() => onOpenSession(session)}
                    aria-label={`${dateFormat.format(session.finishedAt)}, ${formatDuration(session.sessionLengthMs)} focus, ${session.distractions} ${session.distractions === 1 ? "Bonk" : "Bonks"}`}
                  />
                ))}
              </div>
            )}
            {sessions && recent.length === 0 && <p className="muted focus-empty">Your focus shows up here after the first session.</p>}
          </div>
        </section>

        <MemeStorage memes={memes} chosenId={chosenMemeId} onChoose={onChooseMeme} onAdd={onAddMeme} onRemove={onRemoveMeme} />

        <section className="home-card home-card--sessions">
          <h2>Past sessions</h2>
          {sessions === null && <p className="muted">Loading sessions…</p>}
          {sessions && sessions.length === 0 && (
            <p className="muted">Nothing here yet. Press start to begin your first session.</p>
          )}
          {sessions && sessions.length > 0 && (
            <ul className="session-list">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onOpenSession(s)}
                    aria-label={`${dateFormat.format(s.finishedAt)}, ${formatDuration(s.sessionLengthMs)} session, ${s.distractions} ${s.distractions === 1 ? "Bonk" : "Bonks"}`}
                  >
                    <span className="session-when">{dateFormat.format(s.finishedAt)}</span>
                    <span className="session-meta">
                      <span className="session-length">{formatDuration(s.sessionLengthMs)}</span>
                      <span className="session-count">
                        {s.distractions} {s.distractions === 1 ? "Bonk" : "Bonks"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
