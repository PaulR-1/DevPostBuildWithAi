import { useCallback, useRef, useState } from "react";
import { memeById, SAMPLE_MEMES } from "./memes";
import Calibration from "./screens/Calibration";
import Home from "./screens/Home";
import Pause from "./screens/Pause";
import Results, { type SessionStats } from "./screens/Results";
import Session from "./screens/Session";
import TitleCard from "./screens/TitleCard";
import { elapsedMs, endClock, pauseClock, resumeClock, sessionLengthMs, startClock, type Clock } from "./sessionClock";
import type { Reading } from "./tracking/faceTracking";
import { START_FOCUS, stepFocus, type Angle, type Focus } from "./tracking/focusState";
import { useTracking } from "./tracking/useTracking";

type Phase = "home" | "calibrating" | "starting" | "running" | "paused" | "ending" | "results";

const CAMERA_PHASES: Phase[] = ["calibrating", "starting", "running", "paused", "ending"];

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<Phase>("home");
  const [focus, setFocus] = useState<Focus>(START_FOCUS);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [chosenMemeId, setChosenMemeId] = useState(SAMPLE_MEMES[0].id);

  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const safeRef = useRef<Angle | null>(null);
  const focusRef = useRef<Focus>(START_FOCUS);
  const clockRef = useRef<Clock | null>(null);

  const onReading = useCallback((reading: Reading, seconds: number) => {
    if (phaseRef.current !== "running" || !safeRef.current) return;
    focusRef.current = stepFocus(focusRef.current, reading, safeRef.current, seconds);
    setFocus(focusRef.current);
  }, []);

  const cameraOn = CAMERA_PHASES.includes(phase);
  const { status, reading } = useTracking(videoRef, cameraOn, onReading);

  const onCalibrated = useCallback((safe: Angle) => {
    safeRef.current = safe;
    focusRef.current = START_FOCUS;
    setFocus(START_FOCUS);
    setPhase("starting");
  }, []);

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
    setPhase("ending");
  };

  const onEnded = useCallback(() => setPhase("results"), []);

  return (
    <div className="app">
      {cameraOn && <video ref={videoRef} className="camera" playsInline muted />}

      {phase === "home" && (
        <Home onStart={() => setPhase("calibrating")} chosenMemeId={chosenMemeId} onChooseMeme={setChosenMemeId} />
      )}
      {phase === "calibrating" && (
        <Calibration status={status} reading={reading} onCalibrated={onCalibrated} onCancel={() => setPhase("home")} />
      )}
      {phase === "starting" && <TitleCard text="Session Start!" onDone={onStarted} />}
      {(phase === "running" || phase === "paused") && (
        <Session focus={focus} meme={memeById(chosenMemeId)} paused={phase === "paused"} onPause={pause} onPlay={play} onStop={stop} />
      )}
      {phase === "paused" && <Pause />}
      {phase === "ending" && <TitleCard text="Session End" ending onDone={onEnded} />}
      {phase === "results" && stats && <Results stats={stats} onFinish={() => setPhase("home")} />}
    </div>
  );
}
