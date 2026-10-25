import { useCallback, useEffect, useRef, useState } from "react";
import { isCustomMeme, memeById, reviveMeme, SAMPLE_MEMES, storedMeme, type Meme } from "./memes";
import Calibration from "./screens/Calibration";
import FaceSquare from "./screens/FaceSquare";
import Home from "./screens/Home";
import Pause from "./screens/Pause";
import Results, { type SessionStats } from "./screens/Results";
import Session from "./screens/Session";
import Settings from "./screens/Settings";
import { usePresence } from "./screens/usePresence";
import TitleCard from "./screens/TitleCard";
import { elapsedMs, endClock, pauseClock, resumeClock, sessionLengthMs, startClock, type Clock } from "./sessionClock";
import { addSession, deleteSetting, getSetting, setSetting, type PastSession } from "./storage/focusDb";
import type { ProfileData } from "./screens/Profile";
import type { Reading } from "./tracking/faceTracking";
import { angleFromStored, borderHue, START_FOCUS, stepFocus, type Angle, type Focus } from "./tracking/focusState";
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
  const settingsPresence = usePresence(settingsOpen);
  const [sessionsEpoch, setSessionsEpoch] = useState(0);
  const [focus, setFocus] = useState<Focus>(START_FOCUS);
  const [stats, setStats] = useState<SessionStats | null>(null);
  /** True when the results on screen are a past session, already saved. */
  const [viewingPast, setViewingPast] = useState(false);
  const [chosenMemeId, setChosenMemeId] = useState(SAMPLE_MEMES[0].id);
  const [customMemes, setCustomMemes] = useState<Meme[]>([]);
  const memes = [...SAMPLE_MEMES, ...customMemes];
  const [savedAngle, setSavedAngle] = useState<Angle | null>(null);

  const trackingFocus = phase === "running" && !settingsOpen;
  const trackingFocusRef = useRef(trackingFocus);
  trackingFocusRef.current = trackingFocus;
  const safeRef = useRef<Angle | null>(null);
  const focusRef = useRef<Focus>(START_FOCUS);
  const clockRef = useRef<Clock | null>(null);

  useEffect(() => {
    getSetting<string>("chosenMemeId").then((id) => id && setChosenMemeId(id));
    getSetting<unknown[]>("customMemes").then((saved) => {
      if (!Array.isArray(saved)) return;
      setCustomMemes(saved.flatMap((meme) => {
        const revived = reviveMeme(meme);
        return revived ? [revived] : [];
      }));
    });
    getSetting<unknown>("calibration").then((saved) => {
      const angle = angleFromStored(saved);
      if (!angle) return;
      setSavedAngle(angle);
      safeRef.current = angle;
    });
  }, []);

  /** Rejects when the browser refuses to store it, so the meme never shows without being saved. */
  const addMeme = async (meme: Meme) => {
    const next = [...customMemes, meme];
    await setSetting("customMemes", next.map(storedMeme));
    setCustomMemes(next);
    chooseMeme(meme.id);
  };

  const removeMeme = (id: string) => {
    setCustomMemes((prev) => {
      const next = prev.filter((meme) => meme.id !== id);
      setSetting("customMemes", next.map(storedMeme));
      return next;
    });
    if (chosenMemeId === id) chooseMeme(SAMPLE_MEMES[0].id);
    if (!isCustomMeme(id)) return;
    getSetting<ProfileData>("profile").then((profile) => {
      if (!profile?.favouriteMemeId || profile.favouriteMemeId !== id) return;
      const next = { ...profile };
      delete next.favouriteMemeId;
      setSetting("profile", next);
    });
  };

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

  const forgetCalibration = () => {
    // Keep the live angle so the border does not freeze if they cancel the new calibrate.
    setSavedAngle(null);
    deleteSetting("calibration").catch(() => {});
    if (phase === "running") {
      setSettingsOpen(false);
      setPhase("recalibrating-session");
    } else {
      safeRef.current = null;
    }
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
      {cameraOn && reading?.faceBox && (
        <FaceSquare
          videoRef={videoRef}
          box={reading.faceBox}
          hue={borderHue(phase === "running" || phase === "paused" ? focus.redness : 0)}
        />
      )}

      {phase === "home" && (
        <Home
          onStart={() => setPhase("calibrating")}
          memes={memes}
          chosenMemeId={chosenMemeId}
          onChooseMeme={chooseMeme}
          onAddMeme={addMeme}
          onRemoveMeme={removeMeme}
          onOpenSession={openPastSession}
          onOpenSettings={() => setSettingsOpen(true)}
          sessionsEpoch={sessionsEpoch}
        />
      )}
      {phase === "calibrating" && (
        <Calibration status={status} reading={reading} onCalibrated={onCalibrated} onCancel={() => setPhase("home")} />
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
          meme={memeById(chosenMemeId, memes)}
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

      {settingsPresence.mounted && (
        <Settings
          hasCalibration={savedAngle !== null}
          showRecalibrate={phase === "running" || phase === "paused"}
          onRecalibrate={recalibrate}
          onForgetCalibration={forgetCalibration}
          onSessionsCleared={() => setSessionsEpoch((n) => n + 1)}
          onClose={() => setSettingsOpen(false)}
          phase={settingsPresence.phase}
          onTransitionEnd={settingsPresence.onTransitionEnd}
        />
      )}
    </div>
  );
}
