import { useCallback, useEffect, useRef, useState } from "react";
import { memeById, SAMPLE_MEMES } from "./memes";
import Calibration from "./screens/Calibration";
import Home from "./screens/Home";
import Pause from "./screens/Pause";
import Results, { type SessionStats } from "./screens/Results";
import Session from "./screens/Session";
import Settings from "./screens/Settings";
import TitleCard from "./screens/TitleCard";
import { elapsedMs, endClock, pauseClock, resumeClock, sessionLengthMs, startClock, type Clock } from "./sessionClock";
import { addSession, getSetting, setSetting, type PastSession } from "./storage/focusDb";
import type { Reading } from "./tracking/faceTracking";
import { START_FOCUS, stepFocus, type Angle, type Focus } from "./tracking/focusState";
import { useTracking } from "./tracking/useTracking";

type Phase =
  | "home"
  | "calibrating"
  | "recalibrating-home"
  | "starting"
  | "running"
  | "recalibrating-session"
  | "paused"
  | "ending"
  | "results";

const CAMERA_PHASES: Phase[] = [
  "calibrating",
  "recalibrating-home",
  "starting",
  "running",
  "recalibrating-session",
  "paused",
  "ending",
];

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focus, setFocus] = useState<Focus>(START_FOCUS);
  const [stats, setStats] = useState<SessionStats | null>(null);
  /** True when the results on screen are a past session, already saved. */
  const [viewingPast, setViewingPast] = useState(false);
  const [chosenMemeId, setChosenMemeId] = useState(SAMPLE_MEMES[0].id);
  const [savedAngle, setSavedAngle] = useState<Angle | null>(null);

  const trackingFocus = phase === "running" && !settingsOpen;
  const trackingFocusRef = useRef(trackingFocus);
  trackingFocusRef.current = trackingFocus;
  const safeRef = useRef<Angle | null>(null);
  const focusRef = useRef<Focus>(START_FOCUS);
  const clockRef = useRef<Clock | null>(null);

  useEffect(() => {
    getSetting<string>("chosenMemeId").then((id) => id && setChosenMemeId(id));
    getSetting<Angle>("calibration").then((a) => a && setSavedAngle(a));
  }, []);

  const chooseMeme = (id: string) => {
    setChosenMemeId(id);
    setSetting("chosenMemeId", id);
  };

  const onReading = useCallback((reading: Reading, seconds: number) => {
    if (!trackingFocusRef.current || !safeRef.current) return;
    focusRef.current = stepFocus(focusRef.current, reading, safeRef.current, seconds);
    setFocus(focusRef.current);
  }, []);

  const cameraOn = CAMERA_PHASES.includes(phase);
  const { status, reading } = useTracking(videoRef, cameraOn, onReading);

  const saveAngle = (safe: Angle) => {
    safeRef.current = safe;
    setSavedAngle(safe);
    setSetting("calibration", safe);
  };

  const onCalibrated = (safe: Angle) => {
    saveAngle(safe);
    focusRef.current = START_FOCUS;
    setFocus(START_FOCUS);
    setPhase("starting");
  };

  const onRecalibratedHome = (safe: Angle) => {
    saveAngle(safe);
    setPhase("home");
  };

  const onRecalibratedSession = (safe: Angle) => {
    saveAngle(safe);
    focusRef.current = { ...START_FOCUS, distractions: focusRef.current.distractions };
    setFocus(focusRef.current);
    setPhase("running");
  };

  const recalibrate = () => {
    setSettingsOpen(false);
    setPhase(phase === "home" ? "recalibrating-home" : "recalibrating-session");
  };

  const onStarted = useCallback(() => {
    clockRef.current = startClock(Date.now());
    setPhase("running");
  }, []);

  const pause = () => {
    clockRef.current = pauseClock(clockRef.current!, Date.now());
    setPhase("paused");
  };

  const play = () => {
    clockRef.current = resumeClock(clockRef.current!, Date.now());
    setPhase("running");
  };

  const stop = () => {
    const now = Date.now();
    const clock = endClock(clockRef.current!, now);
    clockRef.current = clock;
    setStats({
      sessionLengthMs: sessionLengthMs(clock, now),
      elapsedMs: elapsedMs(clock, now),
      distractions: focusRef.current.distractions,
    });
    setViewingPast(false);
    setPhase("ending");
  };

  const onEnded = useCallback(() => setPhase("results"), []);

  const finish = async () => {
    if (!viewingPast && stats) {
      try {
        await addSession({ ...stats, finishedAt: Date.now() });
      } catch {
        // Storage can fail (e.g. private mode); still return home rather than trap the learner on results.
      }
    }
    setPhase("home");
  };

  const openPastSession = (session: PastSession) => {
    setStats(session);
    setViewingPast(true);
    setPhase("results");
  };

  return (
    <div className="app">
      {cameraOn && <video ref={videoRef} className="camera" playsInline muted />}

      {phase === "home" && (
        <Home
          onStart={() => setPhase("calibrating")}
          chosenMemeId={chosenMemeId}
          onChooseMeme={chooseMeme}
          onOpenSession={openPastSession}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {phase === "calibrating" && (
        <Calibration
          status={status}
          reading={reading}
          savedAngle={savedAngle}
          onCalibrated={onCalibrated}
          onCancel={() => setPhase("home")}
        />
      )}
      {phase === "recalibrating-home" && (
        <Calibration status={status} reading={reading} onCalibrated={onRecalibratedHome} onCancel={() => setPhase("home")} />
      )}
      {phase === "recalibrating-session" && (
        <Calibration
          status={status}
          reading={reading}
          onCalibrated={onRecalibratedSession}
          onCancel={() => setPhase("running")}
        />
      )}
      {phase === "starting" && <TitleCard text="Session Start!" onDone={onStarted} />}
      {(phase === "running" || phase === "paused") && (
        <Session
          focus={focus}
          meme={memeById(chosenMemeId)}
          paused={phase === "paused"}
          onPause={pause}
          onPlay={play}
          onStop={stop}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}
      {phase === "paused" && <Pause />}
      {phase === "ending" && <TitleCard text="Session End" ending onDone={onEnded} />}
      {phase === "results" && stats && <Results stats={stats} onFinish={finish} />}

      {settingsOpen && <Settings onRecalibrate={recalibrate} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
