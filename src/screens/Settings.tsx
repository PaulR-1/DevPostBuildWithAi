import { useEffect, useState, type TransitionEvent } from "react";
import { clearSessions } from "../storage/focusDb";
import { playClick, playDrop } from "../uiSound";
import { useDialog } from "./useDialog";
import type { PresencePhase } from "./usePresence";

type CameraPermission = "granted" | "denied" | "prompt" | "unknown";
type Confirm = "angle" | "sessions" | null;

function useCameraPermission(): CameraPermission {
  const [state, setState] = useState<CameraPermission>("unknown");
  useEffect(() => {
    let status: PermissionStatus | null = null;
    const update = () => status && setState(status.state);
    navigator.permissions
      ?.query({ name: "camera" as PermissionName })
      .then((s) => {
        status = s;
        update();
        s.addEventListener("change", update);
      })
      .catch(() => setState("unknown"));
    return () => status?.removeEventListener("change", update);
  }, []);
  return state;
}

const CAMERA_TEXT: Record<CameraPermission, string> = {
  granted: "Allowed. Sessions can see your face.",
  denied: "Blocked. Unblock the camera in the browser, then come back.",
  prompt: "The browser will ask the next time a session needs the camera.",
  unknown: "The browser didn't say. It will ask when a session needs the camera.",
};

async function askCamera(): Promise<void> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
  } catch {
    // The permission status updates on its own when the browser decides.
  }
}

export default function Settings({
  hasCalibration,
  angleCount,
  showRecalibrate,
  memeVolume,
  ambientVolume,
  onMemeVolume,
  onAmbientVolume,
  onRecalibrate,
  onForgetCalibration,
  onSessionsCleared,
  onClose,
  phase,
  onTransitionEnd,
}: {
  hasCalibration: boolean;
  angleCount: number;
  showRecalibrate: boolean;
  memeVolume: number;
  ambientVolume: number;
  onMemeVolume: (value: number) => void;
  onAmbientVolume: (value: number) => void;
  onRecalibrate: () => void;
  onForgetCalibration: () => void;
  onSessionsCleared: () => void;
  onClose: () => void;
  phase: PresencePhase;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
}) {
  const camera = useCameraPermission();
  const many = angleCount > 1;
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [clearing, setClearing] = useState(false);
  const dialogRef = useDialog(onClose);

  const forget = () => {
    onForgetCalibration();
    setConfirm(null);
  };

  const clearHistory = async () => {
    setClearing(true);
    try {
      await clearSessions();
      onSessionsCleared();
    } catch {
      // Leave the list as it is if storage refuses the delete.
    } finally {
      setClearing(false);
      setConfirm(null);
    }
  };

  return (
    <div
      className="settings-backdrop"
      data-phase={phase}
      onTransitionEnd={onTransitionEnd}
      onClick={() => {
        playDrop();
        onClose();
      }}
    >
      <div className="settings" data-phase={phase} ref={dialogRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <h2 id="settings-title">Settings</h2>

        {showRecalibrate && (
          <section className="settings-group">
            <h3>Focus</h3>
            <div className="settings-row">
              <div>
                <strong>{many ? "Safe angles" : "Safe angle"}</strong>
                <p className="muted">
                  {hasCalibration
                    ? many
                      ? "Safe angles are set. Recalibrate if you moved your laptop, phone, or notebook."
                      : "Recalibrate if you moved your laptop, phone, or notebook."
                    : "Set when you start a session."}
                </p>
              </div>
              <button className="pill-button pill-button--primary" onClick={onRecalibrate}>
                {hasCalibration ? "Recalibrate" : "Calibrate"}
              </button>
            </div>
            {hasCalibration && confirm !== "angle" && (
              <button className="text-button text-button--danger settings-link" data-sound="drop" onClick={() => setConfirm("angle")}>
                {many ? "Forget safe angles" : "Forget safe angle"}
              </button>
            )}
            {confirm === "angle" && (
              <div className="settings-confirm">
                <span>{many ? "Forget the safe angles?" : "Forget the safe angle?"}</span>
                <button className="text-button" data-sound="drop" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
                <button className="pill-button pill-button--danger" data-sound="drop" onClick={forget}>
                  Forget
                </button>
              </div>
            )}
          </section>
        )}

        <section className="settings-group">
          <h3>Camera</h3>
          <div className="settings-row">
            <div>
              <strong>Camera</strong>
              <p className={camera === "denied" ? "settings-warning" : "muted"}>{CAMERA_TEXT[camera]}</p>
            </div>
            {camera !== "granted" && camera !== "denied" && (
              <button className="pill-button" onClick={askCamera}>
                Allow camera
              </button>
            )}
          </div>
        </section>

        <section className="settings-group">
          <h3>Sound</h3>
          <div className="sound-control">
            <div>
              <strong>Meme volume</strong>
              <p className="muted">How loud the bonk and your meme sounds are.</p>
            </div>
            <input
              className="settings-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={memeVolume}
              aria-label="Meme volume"
              onChange={(event) => onMemeVolume(Number(event.target.value))}
            />
          </div>
          <div className="sound-control">
            <div>
              <strong>Ambient volume</strong>
              <p className="muted">Clicks, the 3-2-1 countdown, and the sounds when a session starts and ends.</p>
            </div>
            <input
              className="settings-volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ambientVolume}
              aria-label="Ambient volume"
              onChange={(event) => onAmbientVolume(Number(event.target.value))}
              onPointerUp={() => playClick()}
              onKeyUp={(event) => {
                if (event.key.startsWith("Arrow")) playClick();
              }}
            />
          </div>
        </section>

        <section className="settings-group">
          <h3>History</h3>
          {confirm !== "sessions" ? (
            <div className="settings-row">
              <div>
                <strong>Past sessions</strong>
                <p className="muted">Deletes every saved session from this browser.</p>
              </div>
              <button className="pill-button pill-button--danger settings-clear" data-sound="drop" onClick={() => setConfirm("sessions")}>
                Clear
              </button>
            </div>
          ) : (
            <div className="settings-confirm">
              <span>Delete every past session?</span>
              <button className="text-button" data-sound="drop" onClick={() => setConfirm(null)} disabled={clearing}>
                Cancel
              </button>
              <button className="pill-button pill-button--danger" data-sound="drop" onClick={clearHistory} disabled={clearing}>
                {clearing ? "Deleting…" : "Delete"}
              </button>
            </div>
          )}
        </section>

        <button className="pill-button" data-sound="drop" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
