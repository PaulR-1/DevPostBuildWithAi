import { formatDuration } from "../sessionClock";

export type SessionStats = { sessionLengthMs: number; elapsedMs: number; distractions: number };

export default function Results({ stats, onFinish }: { stats: SessionStats; onFinish: () => void }) {
  return (
    <main className="results">
      <h1 className="big-title">Session Stats</h1>
      <dl className="stats">
        <div>
          <dt>Session length</dt>
          <dd>{formatDuration(stats.sessionLengthMs)}</dd>
        </div>
        <div>
          <dt>Elapsed time</dt>
          <dd>{formatDuration(stats.elapsedMs)}</dd>
        </div>
        <div>
          <dt>Distractions</dt>
          <dd>{stats.distractions}</dd>
        </div>
      </dl>
      <button className="start-button" onClick={onFinish}>
        Finish
      </button>
    </main>
  );
}
