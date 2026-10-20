export type Clock = {
  startedAt: number;
  pausedAt: number | null;
  pausedTotal: number;
  endedAt: number | null;
};

export function startClock(now: number): Clock {
  return { startedAt: now, pausedAt: null, pausedTotal: 0, endedAt: null };
}

export function pauseClock(clock: Clock, now: number): Clock {
  return clock.pausedAt === null ? { ...clock, pausedAt: now } : clock;
}

export function resumeClock(clock: Clock, now: number): Clock {
  if (clock.pausedAt === null) return clock;
  return { ...clock, pausedAt: null, pausedTotal: clock.pausedTotal + (now - clock.pausedAt) };
}

export function endClock(clock: Clock, now: number): Clock {
  return { ...resumeClock(clock, now), endedAt: now };
}

/** All time since start, paused time included. */
export function elapsedMs(clock: Clock, now: number): number {
  return (clock.endedAt ?? now) - clock.startedAt;
}

/** Time spent actually in session, paused time left out. */
export function sessionLengthMs(clock: Clock, now: number): number {
  const end = clock.endedAt ?? now;
  const pausedNow = clock.pausedAt === null ? 0 : end - clock.pausedAt;
  return elapsedMs(clock, now) - clock.pausedTotal - pausedNow;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
