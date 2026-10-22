import { formatDuration } from "../sessionClock";

export type SessionStats = { sessionLengthMs: number; elapsedMs: number; distractions: number };

export default function Results({ stats, onFinish }: { stats: SessionStats; onFinish: () => void }) {
  return (
    <main className="results">
      <h1>Session stats</h1>
      <dl className="stats">
        <div className="stats-hero">
          <dt>Bonks</dt>
          <dd>{stats.distractions}</dd>
          <p>Times the meme bonked you.</p>
        </div>
        <div>
          <dt>Session length</dt>
          <dd>{formatDuration(stats.sessionLengthMs)}</dd>
          <p>Focus time. Pause is left out.</p>
        </div>
        <div>
          <dt>Elapsed time</dt>
          <dd>{formatDuration(stats.elapsedMs)}</dd>
          <p>The whole sitting, pause included.</p>
        </div>
      </dl>
      <button className="start-button" onClick={onFinish}>
        Finish
      </button>
    </main>
  );
}
